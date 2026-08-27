-- G3 Team Hub: FRC channels, knowledge library and notification preferences.
-- Apply once in the Supabase SQL editor before deploying the new Edge Functions.

create table if not exists public.team_channels (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  name_he text,
  description text,
  kind text not null default 'team' check (kind in ('team','subteam','leadership','project','event')),
  subteam text,
  archived boolean not null default false,
  sort_order integer not null default 100,
  created_by uuid references public.team_members(id),
  created_at timestamptz not null default now()
);

create table if not exists public.channel_messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.team_channels(id) on delete cascade,
  author_id uuid not null references public.team_members(id) on delete cascade,
  parent_message_id uuid references public.channel_messages(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 5000),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  edited_at timestamptz
);
create index if not exists channel_messages_channel_created_idx on public.channel_messages(channel_id, created_at);

create table if not exists public.channel_reads (
  channel_id uuid not null references public.team_channels(id) on delete cascade,
  member_id uuid not null references public.team_members(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (channel_id, member_id)
);

create table if not exists public.frc_saved_resources (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'chief_delphi',
  source_url text not null,
  title text not null,
  excerpt text,
  category text,
  saved_by uuid not null references public.team_members(id) on delete cascade,
  project_id uuid references public.team_projects(id) on delete set null,
  internal_note text,
  created_at timestamptz not null default now(),
  unique(saved_by, source_url)
);

create table if not exists public.notification_preferences (
  member_id uuid primary key references public.team_members(id) on delete cascade,
  announcements boolean not null default true,
  mentions boolean not null default true,
  assignments boolean not null default true,
  meeting_reminders boolean not null default true,
  channel_messages boolean not null default true,
  knowledge_digest boolean not null default true,
  private_previews boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.team_channels enable row level security;
alter table public.channel_messages enable row level security;
alter table public.channel_reads enable row level security;
alter table public.frc_saved_resources enable row level security;
alter table public.notification_preferences enable row level security;

create or replace function public.can_access_team_channel(target public.team_channels)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.team_members m where m.id=auth.uid() and m.active and (
    target.kind in ('team','project','event')
    or (target.kind='subteam' and (m.role in ('admin','mentor')
      or lower(coalesce(m.subteam,''))=lower(coalesce(target.subteam,''))
      or (lower(coalesce(target.subteam,'')) in ('electrical','electronics') and lower(coalesce(m.subteam,'')) in ('electrical','electronics'))))
    or (target.kind='leadership' and m.role in ('admin','mentor'))
  ));
$$;
grant execute on function public.can_access_team_channel(public.team_channels) to authenticated;

drop policy if exists "members view available channels" on public.team_channels;
create policy "members view available channels" on public.team_channels for select to authenticated using (not archived and public.can_access_team_channel(team_channels));
drop policy if exists "admins manage channels" on public.team_channels;
create policy "admins manage channels" on public.team_channels for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "members view channel messages" on public.channel_messages;
create policy "members view channel messages" on public.channel_messages for select to authenticated using (not archived and exists(select 1 from public.team_channels c where c.id=channel_id and public.can_access_team_channel(c)));
drop policy if exists "members post channel messages" on public.channel_messages;
create policy "members post channel messages" on public.channel_messages for insert to authenticated with check (author_id=auth.uid() and exists(select 1 from public.team_channels c where c.id=channel_id and public.can_access_team_channel(c)));
drop policy if exists "authors and admins update channel messages" on public.channel_messages;
create policy "authors and admins update channel messages" on public.channel_messages for update to authenticated using (author_id=auth.uid() or public.is_admin()) with check (author_id=auth.uid() or public.is_admin());

drop policy if exists "members manage channel reads" on public.channel_reads;
create policy "members manage channel reads" on public.channel_reads for all to authenticated using (member_id=auth.uid()) with check (member_id=auth.uid());
drop policy if exists "members manage saved resources" on public.frc_saved_resources;
create policy "members manage saved resources" on public.frc_saved_resources for all to authenticated using (saved_by=auth.uid()) with check (saved_by=auth.uid());
drop policy if exists "members manage notification preferences" on public.notification_preferences;
create policy "members manage notification preferences" on public.notification_preferences for all to authenticated using (member_id=auth.uid()) with check (member_id=auth.uid());

insert into public.team_channels(slug,name,name_he,description,kind,subteam,sort_order) values
  ('team-6740','Team 6740','קבוצה 6740','Announcements, questions and progress across G3.','team',null,10),
  ('mechanical','Mechanical','מכניקה','CAD, fabrication, mechanisms and design reviews.','subteam','Mechanical',20),
  ('electrical','Electrical','אלקטרוניקה','Wiring, CAN, power, batteries and inspection.','subteam','Electrical',30),
  ('software','Software','תוכנה','Robot code, controls, vision, releases and testing.','subteam','Software',40),
  ('strategy-scouting','Strategy & Scouting','אסטרטגיה וסקאוטינג','Game analysis, scouting and match planning.','team',null,50),
  ('drive-pit','Drive & Pit','נהיגה ופיט','Robot readiness, repairs and competition turnaround.','team',null,60),
  ('business-outreach','Business & Outreach','קהילה ועסקים','Sponsors, awards, media and outreach.','team',null,70),
  ('mentors-leadership','Mentors & Leadership','מנטורים והנהלה','Private planning for mentors and administrators.','leadership',null,90)
on conflict(slug) do update set name=excluded.name,name_he=excluded.name_he,description=excluded.description,kind=excluded.kind,subteam=excluded.subteam,sort_order=excluded.sort_order;

do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='channel_messages') then
    alter publication supabase_realtime add table public.channel_messages;
  end if;
end $$;
