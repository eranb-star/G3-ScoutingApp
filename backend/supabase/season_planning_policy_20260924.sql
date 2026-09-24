begin;
-- Numeric autonomous constraints have their own version lifecycle; never inferred from a draft import.
create table if not exists public.frc_planning_policies(
 id uuid primary key default gen_random_uuid(),season integer not null references public.frc_knowledge_seasons,
 revision integer not null,policy jsonb not null,sources jsonb not null,actor uuid not null,
 created_at timestamptz not null default now(),unique(season,revision)
);
create table if not exists public.frc_planning_policy_activations(
 id bigint generated always as identity primary key,season integer not null,
 version_id uuid references public.frc_planning_policies,actor uuid not null,note text not null,
 created_at timestamptz not null default now()
);
alter table public.frc_planning_policies enable row level security;
alter table public.frc_planning_policy_activations enable row level security;
revoke all on public.frc_planning_policies,public.frc_planning_policy_activations from public,anon,authenticated;
grant select on public.frc_planning_policies,public.frc_planning_policy_activations to authenticated;
drop policy if exists planning_policy_read on public.frc_planning_policies;
create policy planning_policy_read on public.frc_planning_policies for select to authenticated using(public.can_read_frc_research());
drop policy if exists planning_activation_read on public.frc_planning_policy_activations;
create policy planning_activation_read on public.frc_planning_policy_activations for select to authenticated using(public.can_read_frc_research());
create or replace function public.save_frc_planning_policy(p_season integer,p_policy jsonb,p_sources jsonb,p_expected integer)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare rev integer;result uuid;
begin
 if public.can_manage_frc_sources() is not true then raise exception 'Active evidence administrator required' using errcode='42501';end if;
 if p_expected is null or p_policy is null or jsonb_typeof(p_policy)<>'object' then raise exception 'Invalid policy';end if;
 if coalesce(p_policy->>'seconds','') !~ '^[1-9][0-9]{0,2}$' or (p_policy->>'seconds')::integer>120
 or coalesce(p_policy->>'maxPreload','') !~ '^[0-9]{1,3}$'
 or coalesce(p_policy->>'pointsPerPiece','') !~ '^[0-9]{1,3}$' then raise exception 'Invalid policy numeric limits';end if;
 if public.frc_rule_sources_current(p_season,p_sources) is not true then raise exception 'Current indexed sources required';end if;
 perform pg_advisory_xact_lock(hashtextextended('planning-policy:'||p_season,0));
 select coalesce(max(revision),0) into rev from public.frc_planning_policies where season=p_season;
 if rev<>p_expected then raise exception 'Policy revision changed; reload' using errcode='40001';end if;
 insert into public.frc_planning_policies(season,revision,policy,sources,actor) values(p_season,rev+1,jsonb_build_object('seconds',(p_policy->>'seconds')::integer,'maxPreload',(p_policy->>'maxPreload')::integer,'pointsPerPiece',(p_policy->>'pointsPerPiece')::integer),p_sources,auth.uid()) returning id into result;
 return result;
end$$;
create or replace function public.activate_frc_planning_policy(p_season integer,p_version uuid,p_note text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v public.frc_planning_policies;
begin
 if public.can_manage_frc_sources() is not true then raise exception 'Active evidence administrator required' using errcode='42501';end if;
 if length(trim(coalesce(p_note,''))) not between 1 and 1000 then raise exception 'Review note required';end if;
 perform pg_advisory_xact_lock(hashtextextended('planning-policy:'||p_season,0));
 if p_version is not null then
 select * into v from public.frc_planning_policies where id=p_version and season=p_season;
 if not found or public.frc_rule_sources_current(p_season,v.sources) is not true then raise exception 'Current source revision required';end if;
 end if;
 insert into public.frc_planning_policy_activations(season,version_id,actor,note) values(p_season,p_version,auth.uid(),trim(p_note));
end$$;
create or replace function public.current_frc_planning_policy(p_season integer)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare result jsonb;
begin
 if public.can_use_engineering_plans() is not true then raise exception 'Engineering access required' using errcode='42501';end if;
 select jsonb_build_object('id',v.id,'revision',v.revision,'policy',v.policy,'sources',(select jsonb_agg(s||jsonb_build_object('url',d.url)) from jsonb_array_elements(v.sources) s join public.frc_knowledge_documents d on d.id::text=s->>'documentId')) into result
 from public.frc_planning_policies v where v.id=(select version_id from public.frc_planning_policy_activations where season=p_season order by id desc limit 1) and public.frc_rule_sources_current(p_season,v.sources);
 return result;
end$$;
revoke all on function public.save_frc_planning_policy(integer,jsonb,jsonb,integer),public.activate_frc_planning_policy(integer,uuid,text),public.current_frc_planning_policy(integer) from public,anon;
grant execute on function public.save_frc_planning_policy(integer,jsonb,jsonb,integer),public.activate_frc_planning_policy(integer,uuid,text),public.current_frc_planning_policy(integer) to authenticated;
commit;
