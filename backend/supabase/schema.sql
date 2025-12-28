create extension if not exists pgcrypto;

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  tba_event_key text unique,
  name text not null,
  location text,
  start_date date,
  end_date date,
  active boolean default true,
  created_at timestamp default now()
);

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,
  team_number int not null,
  team_name text,
  tba_team_key text,
  meta jsonb
);

create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,
  match_key text,
  match_type text,
  match_number int,
  scheduled_time timestamp,
  red_teams int[],
  blue_teams int[],
  result jsonb
);

create table if not exists users (
  id uuid primary key,
  display_name text,
  role text check (role in ('SCOUT','STRATEGY')),
  created_at timestamp default now()
);

create table if not exists scout_entries (
  id uuid primary key,
  event_id uuid references events(id) on delete cascade,
  match_id uuid references matches(id) on delete cascade,
  team_number int,
  scout_user_id uuid references users(id),
  device_id text,
  created_at timestamp,
  synced_at timestamp,
  is_duplicate boolean default false,
  data jsonb,
  notes text
);

create index if not exists idx_entries_event_match_team on scout_entries(event_id, match_id, team_number);

create table if not exists form_templates (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,
  name text,
  schema_version int,
  schema jsonb,
  created_at timestamp default now()
);

create table if not exists picklists (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,
  name text,
  created_by uuid references users(id),
  data jsonb,
  created_at timestamp default now()
);
