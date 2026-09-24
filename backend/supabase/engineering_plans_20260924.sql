begin;
create or replace function public.can_use_engineering_plans() returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select public.has_permission('view_field_twin') and exists(select 1 from public.team_members where id=auth.uid() and active)
$$;
revoke all on function public.can_use_engineering_plans() from public,anon;
grant execute on function public.can_use_engineering_plans() to authenticated;
create table if not exists public.engineering_plans(
 id uuid primary key default gen_random_uuid(),owner_id uuid not null,name text not null check(length(name) between 1 and 120),
 shared boolean not null default false,revision integer not null default 0,updated_at timestamptz not null default now()
);
create table if not exists public.engineering_plan_versions(
 plan_id uuid not null references public.engineering_plans,revision integer not null,workspace jsonb not null,
 created_at timestamptz not null default now(),primary key(plan_id,revision)
);
alter table public.engineering_plans enable row level security;
alter table public.engineering_plan_versions enable row level security;
revoke all on public.engineering_plans,public.engineering_plan_versions from public,anon,authenticated;
grant select on public.engineering_plans,public.engineering_plan_versions to authenticated;
drop policy if exists engineering_plan_read on public.engineering_plans;
create policy engineering_plan_read on public.engineering_plans for select to authenticated using(public.can_use_engineering_plans() and (owner_id=auth.uid() or shared));
drop policy if exists engineering_plan_version_read on public.engineering_plan_versions;
create policy engineering_plan_version_read on public.engineering_plan_versions for select to authenticated using(public.can_use_engineering_plans() and exists(select 1 from public.engineering_plans p where p.id=plan_id and (p.owner_id=auth.uid() or p.shared)));
create or replace function public.save_engineering_plan(p_id uuid,p_name text,p_workspace jsonb,p_expected integer,p_shared boolean)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare p public.engineering_plans;next_id uuid;
begin
 if public.can_use_engineering_plans() is not true then raise exception 'Engineering access required' using errcode='42501';end if;
 if length(trim(coalesce(p_name,''))) not between 1 and 120 or p_shared is null or p_expected is null then raise exception 'Invalid plan metadata';end if;
 if p_workspace is null or octet_length(p_workspace::text)>750000 or p_workspace->>'schema' is distinct from '1' or p_workspace#>>'{draft,status}' is distinct from 'unverified-planning-draft' or jsonb_typeof(p_workspace#>'{draft,route}') is distinct from 'array' or jsonb_typeof(p_workspace->'candidates') is distinct from 'array' then raise exception 'Invalid draft workspace';end if;
 if jsonb_array_length(p_workspace#>'{draft,route}') not between 2 and 100 or jsonb_array_length(p_workspace->'candidates')>20 then raise exception 'Draft limit exceeded';end if;
 perform pg_advisory_xact_lock(hashtextextended('engineering-plan-owner:'||auth.uid(),0));
 if (select coalesce(sum(octet_length(v.workspace::text)),0) from public.engineering_plan_versions v join public.engineering_plans owned on owned.id=v.plan_id where owned.owner_id=auth.uid())+octet_length(p_workspace::text)>20000000 then raise exception '20 MB plan-history account limit reached; export your workspace and contact an administrator';end if;
 if p_id is null then
  if p_expected<>0 then raise exception 'New plan must start at revision zero';end if;
  perform pg_advisory_xact_lock(hashtextextended('engineering-plan-owner:'||auth.uid(),0));
  if (select count(*) from public.engineering_plans where owner_id=auth.uid())>=100 then raise exception '100-plan account limit reached';end if;
  insert into public.engineering_plans(owner_id,name,shared) values(auth.uid(),trim(p_name),p_shared) returning * into p;
 else
  select * into p from public.engineering_plans where id=p_id and owner_id=auth.uid() for update;
  if not found then raise exception 'Only the plan owner can save a new revision' using errcode='42501';end if;
 end if;
 if p.revision<>p_expected then raise exception 'Plan changed on another device; reload or save a copy' using errcode='40001';end if;
 if p.revision>=200 then raise exception 'Version limit reached; save a new copy';end if;
 insert into public.engineering_plan_versions(plan_id,revision,workspace) values(p.id,p.revision+1,p_workspace);
 update public.engineering_plans set revision=p.revision+1,name=trim(p_name),shared=p_shared,updated_at=now() where id=p.id;
 return jsonb_build_object('id',p.id,'revision',p.revision+1);
end$$;
revoke all on function public.save_engineering_plan(uuid,text,jsonb,integer,boolean) from public,anon;
grant execute on function public.save_engineering_plan(uuid,text,jsonb,integer,boolean) to authenticated;
commit;
