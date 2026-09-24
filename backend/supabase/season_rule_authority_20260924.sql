begin;
-- Structured scoring is separately reviewed; indexing a document never approves a rule.
create table if not exists public.frc_scoring_rule_versions(
 id uuid primary key default gen_random_uuid(),
 season integer not null references public.frc_knowledge_seasons,
 rule_key text not null check(length(rule_key) between 1 and 80),
 revision integer not null check(revision>0),
 rule jsonb not null,
 sources jsonb not null,
 created_by uuid not null,
 created_at timestamptz not null default now(),
 unique(season,rule_key,revision)
);
create table if not exists public.frc_scoring_rule_activations(
 id bigint generated always as identity primary key,
 season integer not null,
 rule_key text not null,
 version_id uuid references public.frc_scoring_rule_versions,
 actor uuid not null,
 note text not null check(length(note) between 1 and 1000),
 created_at timestamptz not null default now()
);
create index if not exists frc_scoring_rule_latest on public.frc_scoring_rule_activations(season,rule_key,id desc);
alter table public.frc_scoring_rule_versions enable row level security;
alter table public.frc_scoring_rule_activations enable row level security;
revoke all on public.frc_scoring_rule_versions,public.frc_scoring_rule_activations from public,anon,authenticated;
-- No direct client writes: versions and activation history are append-only through RPCs.
grant select on public.frc_scoring_rule_versions,public.frc_scoring_rule_activations to authenticated;
drop policy if exists scoring_versions_read on public.frc_scoring_rule_versions;
create policy scoring_versions_read on public.frc_scoring_rule_versions for select to authenticated using(public.can_read_frc_research());
drop policy if exists scoring_activation_read on public.frc_scoring_rule_activations;
create policy scoring_activation_read on public.frc_scoring_rule_activations for select to authenticated using(public.can_read_frc_research());

create or replace function public.frc_rule_sources_current(p_season integer,p_sources jsonb)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select jsonb_typeof(p_sources)='array' and jsonb_array_length(p_sources) between 1 and 20
 and not exists(select 1 from jsonb_array_elements(p_sources) s
 where not exists(select 1 from public.frc_knowledge_documents d
 where d.season=p_season and d.id::text=s->>'documentId'
 and d.sha256=s->>'sha256' and d.indexed_sha256=d.sha256
 and (s->>'page') ~ '^[1-9][0-9]{0,4}$'
 and length(coalesce(s->>'excerpt','')) between 1 and 4000));
$$;
revoke all on function public.frc_rule_sources_current(integer,jsonb) from public,anon,authenticated;

create or replace function public.save_frc_scoring_rule(p_season integer,p_key text,p_rule jsonb,p_sources jsonb,p_expected_revision integer)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare rev integer; result uuid; level jsonb;
begin
 if public.can_manage_frc_sources() is not true then raise exception 'Active evidence administrator required' using errcode='42501';end if;
 if p_key is null or length(p_key) not between 1 and 80 or p_expected_revision is null then raise exception 'Invalid rule identity';end if;
 perform pg_advisory_xact_lock(hashtextextended('frc-rule:'||p_season||':'||p_key,0));
 select coalesce(max(revision),0) into rev from public.frc_scoring_rule_versions where season=p_season and rule_key=p_key;
 if rev<>p_expected_revision then raise exception 'Rule revision changed; reload before saving' using errcode='40001';end if;
 if p_rule is null or jsonb_typeof(p_rule)<>'object' or octet_length(p_rule::text)>20000
 or coalesce(p_rule->>'threshold','') !~ '^[1-9][0-9]{0,5}$'
 or (p_rule->>'threshold')::integer>100000
 or coalesce(p_rule->>'robots','') !~ '^[1-6]$'
 or jsonb_typeof(p_rule->'levels') is distinct from 'array' then raise exception 'Invalid scoring rule';end if;
 if jsonb_array_length(p_rule->'levels') not between 1 and 8 then raise exception 'Invalid scoring levels';end if;
 for level in select * from jsonb_array_elements(p_rule->'levels') loop
  if jsonb_typeof(level)<>'object' or jsonb_typeof(level->'id') is distinct from 'string' or length(coalesce(level->>'id','')) not between 1 and 80
  or jsonb_typeof(level->'points') is distinct from 'number'
  or coalesce(level->>'points','') !~ '^(0|[1-9][0-9]{0,5})$'
  or (level->>'points')::integer>100000 then raise exception 'Invalid scoring level';end if;
 end loop;
 if (select count(distinct l->>'id') from jsonb_array_elements(p_rule->'levels') l)<>jsonb_array_length(p_rule->'levels') then raise exception 'Duplicate scoring level';end if;
 if public.frc_rule_sources_current(p_season,p_sources) is not true then raise exception 'Sources must reference current indexed documents and page excerpts';end if;
 insert into public.frc_scoring_rule_versions(season,rule_key,revision,rule,sources,created_by)
 values(p_season,p_key,rev+1,jsonb_build_object('id',p_key,'revision',(rev+1)::text,'threshold',(p_rule->>'threshold')::integer,'robots',(p_rule->>'robots')::integer,'levels',p_rule->'levels'),p_sources,auth.uid()) returning id into result;
 return result;
end$$;

create or replace function public.activate_frc_scoring_rule(p_season integer,p_key text,p_version uuid,p_note text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v public.frc_scoring_rule_versions;
begin
 if public.can_manage_frc_sources() is not true then raise exception 'Active evidence administrator required' using errcode='42501';end if;
 if p_key is null or length(p_key) not between 1 and 80 or length(trim(coalesce(p_note,''))) not between 1 and 1000 then raise exception 'Review note required';end if;
 perform pg_advisory_xact_lock(hashtextextended('frc-rule:'||p_season||':'||p_key,0));
 if p_version is not null then
  select * into v from public.frc_scoring_rule_versions where id=p_version and season=p_season and rule_key=p_key;
  if not found then raise exception 'Rule version not found';end if;
  if public.frc_rule_sources_current(p_season,v.sources) is not true then raise exception 'Rule sources changed; review a new revision';end if;
 end if;
 insert into public.frc_scoring_rule_activations(season,rule_key,version_id,actor,note) values(p_season,p_key,p_version,auth.uid(),trim(p_note));
end$$;

create or replace function public.current_frc_scoring_rules(p_season integer)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare result jsonb;
begin
 if public.can_read_frc_research() is not true then raise exception 'Evidence access required' using errcode='42501';end if;
 select coalesce(jsonb_agg(jsonb_build_object('versionId',v.id,'rule',v.rule,'sources',v.sources)),'[]'::jsonb) into result
 from (select distinct on(rule_key) rule_key,version_id from public.frc_scoring_rule_activations where season=p_season order by rule_key,id desc) a
 join public.frc_scoring_rule_versions v on v.id=a.version_id
 where public.frc_rule_sources_current(p_season,v.sources);
 return result;
end$$;
revoke all on function public.save_frc_scoring_rule(integer,text,jsonb,jsonb,integer),public.activate_frc_scoring_rule(integer,text,uuid,text),public.current_frc_scoring_rules(integer) from public,anon;
grant execute on function public.save_frc_scoring_rule(integer,text,jsonb,jsonb,integer),public.activate_frc_scoring_rule(integer,text,uuid,text),public.current_frc_scoring_rules(integer) to authenticated;
commit;
