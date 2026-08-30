-- G3 6740 Phase 5: robot reliability, repeatable testing and readiness.
begin;

create table if not exists public.robot_test_plans (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 3 and 160),
  subsystem text not null,
  purpose text not null check (char_length(trim(purpose)) between 3 and 2000),
  procedure text not null check (char_length(trim(procedure)) between 3 and 5000),
  success_criteria text not null check (char_length(trim(success_criteria)) between 3 and 2000),
  safety_notes text,
  owner_id uuid references public.team_members(id) on delete set null,
  created_by uuid not null references public.team_members(id) on delete restrict default auth.uid(),
  active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.robot_test_runs (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.robot_test_plans(id) on delete cascade,
  performed_by uuid not null references public.team_members(id) on delete restrict default auth.uid(),
  result text not null check (result in ('pass','fail','blocked')),
  notes text check (notes is null or char_length(notes) <= 5000),
  measurements text,
  issue_id uuid references public.robot_issues(id) on delete set null,
  performed_at timestamptz not null default now()
);

create table if not exists public.robot_readiness_checks (
  id uuid primary key default gen_random_uuid(),
  label text not null check (char_length(trim(label)) between 3 and 160),
  category text not null check (category in ('mechanical','electrical','software','battery','inspection','pit')),
  required boolean not null default true,
  sort_order integer not null default 100,
  active boolean not null default true,
  created_by uuid references public.team_members(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.robot_readiness_sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  context text not null default 'workshop' check (context in ('workshop','pre_match','inspection','demo','other')),
  status text not null default 'open' check (status in ('open','completed','cancelled')),
  opened_by uuid not null references public.team_members(id) on delete restrict default auth.uid(),
  completed_at timestamptz, created_at timestamptz not null default now()
);

create table if not exists public.robot_readiness_results (
  session_id uuid not null references public.robot_readiness_sessions(id) on delete cascade,
  check_id uuid not null references public.robot_readiness_checks(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','pass','fail','na')),
  note text,
  checked_by uuid references public.team_members(id) on delete set null,
  checked_at timestamptz,
  primary key(session_id,check_id)
);

create index if not exists robot_test_runs_plan_idx on public.robot_test_runs(plan_id,performed_at desc);
create index if not exists robot_readiness_sessions_status_idx on public.robot_readiness_sessions(status,created_at desc);

alter table public.robot_test_plans enable row level security;
alter table public.robot_test_runs enable row level security;
alter table public.robot_readiness_checks enable row level security;
alter table public.robot_readiness_sessions enable row level security;
alter table public.robot_readiness_results enable row level security;

do $$ declare t text; begin
  foreach t in array array['robot_test_plans','robot_test_runs','robot_readiness_checks','robot_readiness_sessions','robot_readiness_results'] loop
    execute format('drop policy if exists "members read %1$s" on public.%1$I',t);
    execute format('create policy "members read %1$s" on public.%1$I for select to authenticated using (public.current_team_role() is not null)',t);
    execute format('drop policy if exists "members create %1$s" on public.%1$I',t);
    execute format('create policy "members create %1$s" on public.%1$I for insert to authenticated with check (public.current_team_role() is not null)',t);
    execute format('drop policy if exists "members update %1$s" on public.%1$I',t);
    execute format('create policy "members update %1$s" on public.%1$I for update to authenticated using (public.current_team_role() is not null) with check (public.current_team_role() is not null)',t);
    execute format('drop policy if exists "admins delete %1$s" on public.%1$I',t);
    execute format('create policy "admins delete %1$s" on public.%1$I for delete to authenticated using (public.is_admin())',t);
  end loop;
end $$;

insert into public.robot_readiness_checks(label,category,required,sort_order,created_by)
select v.label,v.category,v.required,v.sort_order,null from (values
 ('Frame, bumpers and fasteners secure','mechanical',true,10),
 ('Mechanisms move freely through full range','mechanical',true,20),
 ('Main breaker, PDP/PDH and wiring secure','electrical',true,30),
 ('CAN bus and device health verified','electrical',true,40),
 ('Battery charged, tested and restrained','battery',true,50),
 ('Correct robot code deployed and labeled','software',true,60),
 ('Driver controls and emergency stop tested','software',true,70),
 ('Radio connection and field communication verified','inspection',true,80),
 ('Robot passes current inspection checklist','inspection',true,90),
 ('Pit tools, spares and charged batteries ready','pit',false,100)
) as v(label,category,required,sort_order)
where not exists(select 1 from public.robot_readiness_checks);

commit;
