-- Location-verified attendance. Raw device coordinates are never stored.

create table if not exists public.workshop_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'G3 Workshop',
  latitude double precision not null,
  longitude double precision not null,
  radius_m integer not null default 150 check (radius_m between 25 and 1000),
  active boolean not null default false,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create unique index if not exists one_active_workshop_location
on public.workshop_locations ((active)) where active = true;

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.team_meetings(id) on delete cascade,
  member_id uuid not null references public.team_members(id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  checked_out_at timestamptz,
  check_in_method text not null default 'location' check (check_in_method in ('location','admin')),
  check_out_method text check (check_out_method in ('location','admin','automatic')),
  check_in_distance_m integer,
  check_out_distance_m integer,
  check_in_accuracy_m integer,
  check_out_accuracy_m integer,
  corrected_by uuid references auth.users(id),
  correction_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (meeting_id, member_id),
  check (checked_out_at is null or checked_out_at >= checked_in_at)
);

create index if not exists attendance_meeting_idx on public.attendance_records(meeting_id);
create index if not exists attendance_member_idx on public.attendance_records(member_id, checked_in_at desc);

create table if not exists public.attendance_audit_log (
  id bigint generated always as identity primary key,
  attendance_id uuid references public.attendance_records(id) on delete set null,
  actor_id uuid not null references auth.users(id),
  action text not null,
  reason text,
  previous_values jsonb,
  new_values jsonb,
  created_at timestamptz not null default now()
);

alter table public.workshop_locations enable row level security;
alter table public.attendance_records enable row level security;
alter table public.attendance_audit_log enable row level security;

drop policy if exists "admins manage workshop location" on public.workshop_locations;
create policy "admins manage workshop location" on public.workshop_locations
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "members read own attendance" on public.attendance_records;
create policy "members read own attendance" on public.attendance_records
for select to authenticated using (member_id = auth.uid());

drop policy if exists "admins read all attendance" on public.attendance_records;
create policy "admins read all attendance" on public.attendance_records
for select to authenticated using (public.is_admin());

drop policy if exists "admins update attendance" on public.attendance_records;
create policy "admins update attendance" on public.attendance_records
for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins read attendance audit" on public.attendance_audit_log;
create policy "admins read attendance audit" on public.attendance_audit_log
for select to authenticated using (public.is_admin());

-- Insert the real location only after confirming it. Keep active=false until then:
-- insert into public.workshop_locations (name, latitude, longitude, radius_m, active)
-- values ('G3 Workshop', 0, 0, 150, false);

