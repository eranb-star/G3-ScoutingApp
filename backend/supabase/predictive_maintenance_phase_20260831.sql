-- G3 6740 predictive maintenance and component lifecycle. Safe to run more than once.
begin;

create table if not exists public.robot_components(
  id uuid primary key default gen_random_uuid(), name text not null, category text not null,
  serial_number text, part_number text, manufacturer text, status text not null default 'spare' check(status in ('installed','spare','service_due','failed','retired')),
  service_interval_days integer check(service_interval_days is null or service_interval_days>0), last_serviced_at timestamptz, notes text,
  created_by uuid references public.team_members(id) on delete set null default auth.uid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index if not exists robot_components_serial_unique on public.robot_components(serial_number) where serial_number is not null;

create table if not exists public.robot_component_events(
  id uuid primary key default gen_random_uuid(), component_id uuid not null references public.robot_components(id) on delete cascade,
  event_type text not null check(event_type in ('installed','removed','inspected','serviced','repaired','failed','retired')),
  robot_location text, notes text, issue_id uuid references public.robot_issues(id) on delete set null,
  performed_by uuid not null references public.team_members(id) on delete restrict default auth.uid(), performed_at timestamptz not null default now()
);

create table if not exists public.robot_batteries(
  id uuid primary key default gen_random_uuid(), asset_tag text not null unique, manufacturer text, purchase_date date,
  status text not null default 'available' check(status in ('available','charging','in_use','service_due','quarantined','retired')),
  notes text, created_by uuid references public.team_members(id) on delete set null default auth.uid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.robot_battery_tests(
  id uuid primary key default gen_random_uuid(), battery_id uuid not null references public.robot_batteries(id) on delete cascade,
  voltage numeric(5,2) not null check(voltage between 0 and 20), internal_resistance_mohm numeric(8,2) check(internal_resistance_mohm is null or internal_resistance_mohm>=0),
  result text not null check(result in ('pass','monitor','fail')), notes text,
  tested_by uuid not null references public.team_members(id) on delete restrict default auth.uid(), tested_at timestamptz not null default now()
);

create index if not exists robot_component_events_component_idx on public.robot_component_events(component_id,performed_at desc);
create index if not exists robot_battery_tests_battery_idx on public.robot_battery_tests(battery_id,tested_at desc);

alter table public.robot_components enable row level security; alter table public.robot_component_events enable row level security;
alter table public.robot_batteries enable row level security; alter table public.robot_battery_tests enable row level security;
do $$ declare t text; begin foreach t in array array['robot_components','robot_component_events','robot_batteries','robot_battery_tests'] loop
  execute format('drop policy if exists "members read %1$s" on public.%1$I',t);
  execute format('create policy "members read %1$s" on public.%1$I for select to authenticated using (public.current_team_role() is not null)',t);
  execute format('drop policy if exists "members create %1$s" on public.%1$I',t);
  execute format('create policy "members create %1$s" on public.%1$I for insert to authenticated with check (public.current_team_role() is not null)',t);
  execute format('drop policy if exists "members update %1$s" on public.%1$I',t);
  execute format('create policy "members update %1$s" on public.%1$I for update to authenticated using (public.current_team_role() is not null) with check (public.current_team_role() is not null)',t);
  execute format('drop policy if exists "admins delete %1$s" on public.%1$I',t);
  execute format('create policy "admins delete %1$s" on public.%1$I for delete to authenticated using (public.is_admin())',t);
end loop; end $$;
commit;
