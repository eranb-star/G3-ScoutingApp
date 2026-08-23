-- G3 recurring workshop schedule and attendance-session foundation.
-- Israel time is authoritative; timestamptz preserves DST transitions correctly.

create table if not exists public.meeting_rules (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  timezone text not null default 'Asia/Jerusalem',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (day_of_week, start_time, end_time, timezone)
);

create table if not exists public.team_meetings (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid references public.meeting_rules(id) on delete set null,
  meeting_date date not null,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'open', 'closed', 'cancelled')),
  meeting_type text not null default 'workshop' check (meeting_type in ('workshop', 'subteam', 'competition', 'special')),
  notes text,
  created_by uuid references auth.users(id),
  opened_by uuid references auth.users(id),
  opened_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  unique nulls not distinct (rule_id, meeting_date)
);

create index if not exists team_meetings_starts_at_idx on public.team_meetings(starts_at);
create index if not exists team_meetings_status_idx on public.team_meetings(status);
alter table public.meeting_rules enable row level security;
alter table public.team_meetings enable row level security;

insert into public.meeting_rules (title, day_of_week, start_time, end_time, timezone)
values
  ('Sunday workshop', 0, '16:00', '19:00', 'Asia/Jerusalem'),
  ('Wednesday workshop', 3, '16:00', '19:00', 'Asia/Jerusalem')
on conflict (day_of_week, start_time, end_time, timezone)
do update set title = excluded.title, active = true;

create or replace function public.ensure_workshop_schedule(days_ahead integer default 120)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare inserted_count integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  insert into public.team_meetings (rule_id, meeting_date, title, starts_at, ends_at, meeting_type)
  select r.id,
         d::date,
         r.title,
         ((d::date + r.start_time) at time zone r.timezone),
         ((d::date + r.end_time) at time zone r.timezone),
         'workshop'
  from public.meeting_rules r
  cross join generate_series(current_date - 14, current_date + greatest(1, least(days_ahead, 366)), interval '1 day') d
  where r.active and extract(dow from d)::smallint = r.day_of_week
  on conflict (rule_id, meeting_date) do nothing;
  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

create or replace function public.set_meeting_status(meeting_id uuid, next_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if next_status not in ('scheduled','open','closed','cancelled') then raise exception 'Invalid meeting status'; end if;
  update public.team_meetings set
    status = next_status,
    opened_by = case when next_status = 'open' then auth.uid() else opened_by end,
    opened_at = case when next_status = 'open' then now() else opened_at end,
    closed_at = case when next_status = 'closed' then now() else closed_at end
  where id = meeting_id;
  if not found then raise exception 'Meeting not found'; end if;
end;
$$;

grant execute on function public.ensure_workshop_schedule(integer) to authenticated;
grant execute on function public.set_meeting_status(uuid, text) to authenticated;

drop policy if exists "active members read meeting rules" on public.meeting_rules;
create policy "active members read meeting rules" on public.meeting_rules
for select to authenticated using (public.current_team_role() is not null);

drop policy if exists "active members read meetings" on public.team_meetings;
create policy "active members read meetings" on public.team_meetings
for select to authenticated using (public.current_team_role() is not null);

drop policy if exists "admins create meetings" on public.team_meetings;
create policy "admins create meetings" on public.team_meetings
for insert to authenticated with check (public.is_admin() and created_by = auth.uid());

drop policy if exists "admins update meetings" on public.team_meetings;
create policy "admins update meetings" on public.team_meetings
for update to authenticated using (public.is_admin()) with check (public.is_admin());

