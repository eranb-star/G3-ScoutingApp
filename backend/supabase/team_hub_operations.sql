-- Flexible workshop operations and team announcements.

alter table public.team_meetings
  add column if not exists is_ad_hoc boolean not null default false;

create or replace function public.open_workshop_now(session_title text default 'Open workshop')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare new_id uuid;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if exists (select 1 from public.team_meetings where status = 'open') then
    raise exception 'A workshop session is already open';
  end if;
  insert into public.team_meetings
    (meeting_date, title, starts_at, ends_at, status, meeting_type, is_ad_hoc, created_by, opened_by, opened_at)
  values
    ((now() at time zone 'Asia/Jerusalem')::date, coalesce(nullif(trim(session_title),''),'Open workshop'), now(), now() + interval '12 hours', 'open', 'workshop', true, auth.uid(), auth.uid(), now())
  returning id into new_id;
  return new_id;
end;
$$;
grant execute on function public.open_workshop_now(text) to authenticated;

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  audience text not null default 'all' check (audience in ('all','members','mentors','admins','subteam')),
  audience_subteam text,
  priority text not null default 'normal' check (priority in ('normal','important','urgent')),
  meeting_id uuid references public.team_meetings(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  created_by uuid not null references public.team_members(id),
  published_at timestamptz not null default now(),
  expires_at timestamptz,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.announcement_reads (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  member_id uuid not null references public.team_members(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (announcement_id, member_id)
);

alter table public.announcements enable row level security;
alter table public.announcement_reads enable row level security;

drop policy if exists "members read applicable announcements" on public.announcements;
create policy "members read applicable announcements" on public.announcements
for select to authenticated using (
  not archived and (expires_at is null or expires_at > now()) and
  (audience = 'all'
   or audience = public.current_team_role() || 's'
   or (audience = 'subteam' and audience_subteam = (select subteam from public.team_members where id = auth.uid())))
);

drop policy if exists "admins create announcements" on public.announcements;
create policy "admins create announcements" on public.announcements
for insert to authenticated with check (public.is_admin() and created_by = auth.uid());

drop policy if exists "admins update announcements" on public.announcements;
create policy "admins update announcements" on public.announcements
for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "members read own announcement receipts" on public.announcement_reads;
create policy "members read own announcement receipts" on public.announcement_reads
for select to authenticated using (member_id = auth.uid());

drop policy if exists "members mark own announcements read" on public.announcement_reads;
create policy "members mark own announcements read" on public.announcement_reads
for insert to authenticated with check (member_id = auth.uid());

alter publication supabase_realtime add table public.announcements;
alter publication supabase_realtime add table public.attendance_records;

