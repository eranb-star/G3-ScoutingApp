begin;
-- Extends the existing evidence index. No scheduler, external fetch or model call.
create table if not exists public.frc_research_topics(
 id text primary key default gen_random_uuid()::text,
 name text not null check(length(trim(name)) between 2 and 80),
 name_he text not null default '',kind text not null check(kind in ('mechanism','subject')),
 synonyms text[] not null default '{}',description text not null default '',
 active boolean not null default true,revision integer not null default 1,
 unique(name)
);
create unique index if not exists frc_topic_name_ci on public.frc_research_topics(lower(trim(name)));
create table if not exists public.frc_robot_configurations(
 id uuid primary key default gen_random_uuid(),team integer not null check(team between 1 and 99999),
 season integer not null check(season between 1992 and 2100),name text not null check(length(trim(name)) between 1 and 120),
 configuration text not null check(length(trim(configuration)) between 3 and 160),
 unique(team,season,configuration)
);
create table if not exists public.frc_topic_evidence(
 id uuid primary key default gen_random_uuid(),topic_id text not null references public.frc_research_topics,
 claim_id uuid not null references public.frc_evidence_claims,claim_revision integer not null,
 robot_id uuid references public.frc_robot_configurations,
 present boolean not null default true,status text not null default 'proposed' check(status in ('proposed','confirmed','rejected')),
 note text not null default '',revision integer not null default 1,
 reviewed_by uuid,reviewed_at timestamptz,
 unique(topic_id,claim_id,claim_revision)
);
create index if not exists frc_topic_evidence_robot on public.frc_topic_evidence(robot_id,topic_id,status);
create index if not exists frc_topic_evidence_claim on public.frc_topic_evidence(claim_id,claim_revision);
create table if not exists public.frc_research_events(
 id bigint generated always as identity primary key,actor_id uuid default auth.uid(),
 action text not null,snapshot jsonb not null,created_at timestamptz not null default now()
);
create or replace function public.can_read_frc_research() returns boolean language sql stable security definer set search_path=public as $$
 select public.has_permission('view_evidence_search') and exists(select 1 from public.team_members where id=auth.uid() and active)
$$;
alter table public.frc_research_topics enable row level security;
alter table public.frc_robot_configurations enable row level security;
alter table public.frc_topic_evidence enable row level security;
alter table public.frc_research_events enable row level security;
drop policy if exists research_topics_read on public.frc_research_topics;
create policy research_topics_read on public.frc_research_topics for select to authenticated using(public.can_read_frc_research());
drop policy if exists research_robots_read on public.frc_robot_configurations;
create policy research_robots_read on public.frc_robot_configurations for select to authenticated using(public.can_read_frc_research());
drop policy if exists research_links_read on public.frc_topic_evidence;
create policy research_links_read on public.frc_topic_evidence for select to authenticated using(public.can_read_frc_research() and (public.can_manage_frc_sources() or (status='confirmed' and exists(select 1 from public.frc_evidence_claims c join public.frc_evidence_sources s on s.id=c.source_id where c.id=claim_id and c.revision=claim_revision and c.status='published' and s.current))));
drop policy if exists research_events_read on public.frc_research_events;
create policy research_events_read on public.frc_research_events for select to authenticated using(public.can_manage_frc_sources());
revoke all on public.frc_research_topics,public.frc_robot_configurations,public.frc_topic_evidence,public.frc_research_events from public,anon,authenticated;
grant select on public.frc_research_topics,public.frc_robot_configurations,public.frc_topic_evidence,public.frc_research_events to authenticated;
grant all on public.frc_research_topics,public.frc_robot_configurations,public.frc_topic_evidence,public.frc_research_events to service_role;

-- Literal whole-word matching: terms never become executable regular expressions.
create or replace function public.frc_topic_mentions(p_text text,p_terms text[]) returns boolean language sql immutable as $$
 select exists(select 1 from unnest(p_terms) term where length(trim(term))>=2 and
 (' '||regexp_replace(lower(coalesce(p_text,'')),'[^[:alnum:]א-ת]+',' ','g')||' ') like
 '% '||replace(replace(replace(regexp_replace(lower(trim(term)),'[^[:alnum:]א-ת]+',' ','g'),'\','\\'),'%','\%'),'_','\_')||' %')
$$;
create or replace function public.scan_frc_topic_candidates(p_topic text default null,p_claim uuid default null) returns integer
language plpgsql security definer set search_path=public as $$
declare n integer;
begin
 if not public.can_manage_frc_sources() then raise exception 'Active evidence administrator required' using errcode='42501';end if;
 insert into public.frc_topic_evidence(topic_id,claim_id,claim_revision)
 select t.id,c.id,c.revision from public.frc_research_topics t cross join public.frc_evidence_claims c
 join public.frc_evidence_sources s on s.id=c.source_id
 where t.active and (p_topic is null or t.id=p_topic) and (p_claim is null or c.id=p_claim)
 and c.status='published' and s.current and public.frc_topic_mentions(c.title||' '||c.body||' '||coalesce(c.title_he,'')||' '||coalesce(c.body_he,''),array[t.name,t.name_he]||t.synonyms)
 on conflict do nothing;
 get diagnostics n=row_count;return n;
end$$;
create or replace function public.frc_research_rescan_trigger() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if public.can_manage_frc_sources() then
  if tg_table_name='frc_research_topics' then perform public.scan_frc_topic_candidates(new.id,null);
  else perform public.scan_frc_topic_candidates(null,new.id);end if;
 end if;return new;
end$$;
drop trigger if exists frc_topic_scan on public.frc_research_topics;
create trigger frc_topic_scan after insert or update on public.frc_research_topics for each row execute function public.frc_research_rescan_trigger();
drop trigger if exists frc_claim_topic_scan on public.frc_evidence_claims;
create trigger frc_claim_topic_scan after insert or update on public.frc_evidence_claims for each row execute function public.frc_research_rescan_trigger();

create or replace function public.save_frc_research_topic(p_id text,p_expected integer,p_name text,p_name_he text,p_kind text,p_synonyms text[],p_description text,p_active boolean default true) returns text
language plpgsql security definer set search_path=public as $$
declare result text;oldrow public.frc_research_topics%rowtype;
begin
 if not public.can_manage_frc_sources() then raise exception 'Active evidence administrator required' using errcode='42501';end if;
 if cardinality(p_synonyms)>40 or length(coalesce(p_description,''))>1000 or exists(select 1 from unnest(p_synonyms) x where length(x)>80 or length(trim(x))<2) then raise exception 'Use up to 40 synonyms, 2–80 characters each';end if;
 if p_id is null then
 insert into public.frc_research_topics(name,name_he,kind,synonyms,description,active) values(trim(p_name),trim(p_name_he),p_kind,coalesce(p_synonyms,'{}'),p_description,p_active) returning id into result;
 else
 select * into oldrow from public.frc_research_topics where id=p_id for update;
 if not found or oldrow.revision<>p_expected then raise exception 'Topic changed; refresh before saving';end if;
 if oldrow.kind<>p_kind then raise exception 'Topic type cannot change; create a separate topic';end if;
 update public.frc_research_topics set name=trim(p_name),name_he=trim(p_name_he),synonyms=coalesce(p_synonyms,'{}'),description=p_description,active=p_active,revision=revision+1 where id=p_id returning id into result;
 end if;
 insert into public.frc_research_events(action,snapshot) values('topic_saved',jsonb_build_object('id',result,'before',to_jsonb(oldrow),'name',p_name));return result;
end$$;

create or replace function public.save_frc_robot_configuration(p_team integer,p_season integer,p_name text,p_configuration text) returns uuid
language plpgsql security definer set search_path=public as $$
declare result uuid;
begin
 if not public.can_manage_frc_sources() then raise exception 'Active evidence administrator required' using errcode='42501';end if;
 insert into public.frc_robot_configurations(team,season,name,configuration) values(p_team,p_season,trim(p_name),trim(p_configuration)) on conflict(team,season,configuration) do nothing returning id into result;
 if result is null then select id into result from public.frc_robot_configurations where team=p_team and season=p_season and configuration=trim(p_configuration);end if;
 insert into public.frc_research_events(action,snapshot) values('configuration_registered',jsonb_build_object('id',result,'team',p_team,'season',p_season));return result;
end$$;

create or replace function public.review_frc_topic_evidence(p_id uuid,p_expected integer,p_robot uuid,p_present boolean,p_status text,p_note text) returns void
language plpgsql security definer set search_path=public as $$
declare a public.frc_topic_evidence%rowtype;k text;source_year integer;
begin
 if not public.can_manage_frc_sources() then raise exception 'Active evidence administrator required' using errcode='42501';end if;
 if p_status not in ('confirmed','rejected') or length(trim(coalesce(p_note,'')))<3 then raise exception 'Review decision and reason required';end if;
 select * into a from public.frc_topic_evidence where id=p_id for update;
 if not found or a.revision<>p_expected then raise exception 'Review changed; refresh before saving';end if;
 select kind into k from public.frc_research_topics where id=a.topic_id and active;
 if k is null then raise exception 'Active topic required';end if;
 if p_status='confirmed' then
 select s.season into source_year from public.frc_evidence_claims c join public.frc_evidence_sources s on s.id=c.source_id where c.id=a.claim_id and c.revision=a.claim_revision and c.status='published' and s.current;
 if source_year is null then raise exception 'Evidence changed or retired; review the current revision';end if;
 if k='mechanism' and p_robot is null then raise exception 'Select the documented robot configuration';end if;
 if p_robot is not null and not exists(select 1 from public.frc_robot_configurations where id=p_robot and season=source_year) then raise exception 'Robot and source seasons must match';end if;
 end if;
 insert into public.frc_research_events(action,snapshot) values('association_reviewed',jsonb_build_object('before',to_jsonb(a),'decision',p_status,'note',p_note));
 update public.frc_topic_evidence set robot_id=p_robot,present=p_present,status=p_status,note=trim(p_note),revision=revision+1,reviewed_by=auth.uid(),reviewed_at=now() where id=p_id;
end$$;

-- Paginated server search, not a download of the historical corpus into the browser.
create or replace function public.search_frc_robots(p_topics text[] default '{}',p_mode text default 'all',p_seasons integer[] default '{}',p_query text default '',p_exclude text[] default '{}',p_page integer default 0) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare result jsonb;
begin
 if not public.can_read_frc_research() then raise exception 'Evidence access required' using errcode='42501';end if;
 if p_mode not in ('all','any') or p_page<0 or p_page>10000 or cardinality(p_topics)>50 or cardinality(p_exclude)>50 or cardinality(p_seasons)>110 or length(p_query)>200 then raise exception 'Invalid search';end if;
 with candidate_facts as (
 select a.*,t.name topic_name,t.name_he topic_name_he,t.synonyms,t.kind,c.title,c.body,c.locator,s.url,s.title source_title,s.checked_at,s.revision source_revision
 from public.frc_topic_evidence a join public.frc_research_topics t on t.id=a.topic_id and t.active
 join public.frc_evidence_claims c on c.id=a.claim_id and c.revision=a.claim_revision and c.status='published'
 join public.frc_evidence_sources s on s.id=c.source_id and s.current
 where a.status='confirmed' and a.robot_id is not null
 ), valid as (
 select v.* from candidate_facts v where not exists(select 1 from candidate_facts opposite where opposite.robot_id=v.robot_id and opposite.topic_id=v.topic_id and opposite.present<>v.present)
 ), matched as (
 select r.* from public.frc_robot_configurations r
 where (cardinality(p_seasons)=0 or r.season=any(p_seasons))
 and exists(select 1 from valid v where v.robot_id=r.id)
 and (cardinality(p_topics)=0 or (p_mode='all' and not exists(select 1 from unnest(p_topics) x where not exists(select 1 from valid v where v.robot_id=r.id and v.topic_id=x and v.present))) or (p_mode='any' and exists(select 1 from valid v where v.robot_id=r.id and v.topic_id=any(p_topics) and v.present)))
 -- Exclusion means documented absence. Unknown must not pass an absence filter.
 and not exists(select 1 from unnest(p_exclude) x where not exists(select 1 from valid v where v.robot_id=r.id and v.topic_id=x and not v.present))
 and not exists(select 1 from unnest(regexp_split_to_array(lower(trim(p_query)),'\s+')) w where w<>'' and position(w in lower(r.team::text||' '||r.name||' '||r.configuration||' '||coalesce((select string_agg(v.title||' '||v.body||' '||v.topic_name||' '||v.topic_name_he||' '||array_to_string(v.synonyms,' '),' ') from valid v where v.robot_id=r.id),'')))=0)
 ), page as (select * from matched order by season desc,team,id limit 12 offset p_page*12)
 select jsonb_build_object('total',(select count(*) from matched),'rows',coalesce((select jsonb_agg(to_jsonb(r)||jsonb_build_object('facts',(select jsonb_agg(to_jsonb(v) order by v.topic_name,v.id) from valid v where v.robot_id=r.id)) order by r.season desc,r.team,r.id) from page r),'[]'::jsonb),
 'coverage',coalesce((select jsonb_agg(x order by x.season desc) from (select r.season,count(*) configurations from public.frc_robot_configurations r where exists(select 1 from valid v where v.robot_id=r.id) group by r.season)x),'[]'::jsonb)) into result;
 return result;
end$$;

create or replace function public.add_frc_robot_reference(p_season integer,p_url text,p_source_title text,p_title text,p_body text,p_locator text,p_note text) returns uuid
language plpgsql security definer set search_path=public as $$
declare source_id text;result uuid;
begin
 if not public.can_manage_frc_sources() then raise exception 'Active evidence administrator required' using errcode='42501';end if;
 if p_url !~ '^https://[A-Za-z0-9.-]+(:[0-9]+)?([/?#][^[:space:]]*)?$' or length(p_url)>2000 or length(trim(p_source_title)) not between 3 and 180 or length(trim(p_note)) not between 3 and 1000 then raise exception 'Valid HTTPS source, title and review note required';end if;
 source_id:='research-'||gen_random_uuid()::text;
 insert into public.frc_evidence_sources(id,title,season,authority,url,revision) values(source_id,trim(p_source_title),p_season,'team',p_url,'Web reference reviewed '||current_date::text||'; link only');
 result:=public.curate_frc_evidence(null,0,source_id,p_title,p_body,p_locator,'fact','published',p_note);
 insert into public.frc_research_events(action,snapshot) values('reference_added',jsonb_build_object('claim_id',result,'source_id',source_id,'note',p_note));
 return result;
end$$;

create or replace function public.frc_research_review_queue(p_page integer default 0,p_status text default 'proposed') returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare result jsonb;
begin
 if not public.can_manage_frc_sources() then raise exception 'Active evidence administrator required' using errcode='42501';end if;
 if p_page<0 or p_page>10000 or p_status not in ('proposed','confirmed','rejected') then raise exception 'Invalid queue';end if;
 select jsonb_build_object('total',(select count(*) from public.frc_topic_evidence where status=p_status),'rows',coalesce((select jsonb_agg(x) from (
 select a.*,c.title,c.body,c.locator,s.url,s.season,t.name topic_name,t.name_he topic_name_he,(s.current and c.revision=a.claim_revision and c.status='published') current
 from public.frc_topic_evidence a join public.frc_research_topics t on t.id=a.topic_id join public.frc_evidence_claims c on c.id=a.claim_id join public.frc_evidence_sources s on s.id=c.source_id where a.status=p_status order by s.season desc,a.id limit 10 offset p_page*10)x),'[]'::jsonb),
 'configurations',coalesce((select jsonb_agg(r order by season desc,team) from public.frc_robot_configurations r),'[]'::jsonb)) into result;return result;
end$$;
revoke all on function public.frc_research_review_queue(integer,text) from public,anon;
grant execute on function public.frc_research_review_queue(integer,text) to authenticated;
revoke all on function public.add_frc_robot_reference(integer,text,text,text,text,text,text) from public,anon;
grant execute on function public.add_frc_robot_reference(integer,text,text,text,text,text,text) to authenticated;
revoke all on function public.can_read_frc_research(),public.scan_frc_topic_candidates(text,uuid),public.frc_research_rescan_trigger(),public.save_frc_research_topic(text,integer,text,text,text,text[],text,boolean),public.save_frc_robot_configuration(integer,integer,text,text),public.review_frc_topic_evidence(uuid,integer,uuid,boolean,text,text),public.search_frc_robots(text[],text,integer[],text,text[],integer) from public,anon;
grant execute on function public.can_read_frc_research(),public.scan_frc_topic_candidates(text,uuid),public.save_frc_research_topic(text,integer,text,text,text,text[],text,boolean),public.save_frc_robot_configuration(integer,integer,text,text),public.review_frc_topic_evidence(uuid,integer,uuid,boolean,text,text),public.search_frc_robots(text[],text,integer[],text,text[],integer) to authenticated;
commit;
