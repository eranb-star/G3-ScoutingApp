-- Staged migration. Credentials and source evidence are service-role only.
begin;
create table if not exists public.cad_connections (
 id uuid primary key default gen_random_uuid(),
 member_id uuid not null references public.team_members(id),
 credential jsonb not null,
 expires_at timestamptz not null,
 refresh_lock_until timestamptz,
 disconnected_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(member_id)
);
create table if not exists public.cad_oauth_states (
 state_hash text primary key,
 member_id uuid not null references public.team_members(id),
 expires_at timestamptz not null,
 created_at timestamptz not null default now()
);
create table if not exists public.cad_sources (
 id uuid primary key default gen_random_uuid(),
 connection_id uuid not null references public.cad_connections(id),
 document_id text not null check(document_id ~ '^[a-f0-9]{24}$'),
 reference_type text not null check(reference_type in ('w','v','m')),
 reference_id text not null check(reference_id ~ '^[a-f0-9]{24}$'),
 element_id text not null check(element_id ~ '^[a-f0-9]{24}$'),
 configuration text not null default 'default',
 name text not null,
 element_type text not null,
 archived_at timestamptz,
 created_at timestamptz not null default now(),
 unique(connection_id,document_id,reference_type,reference_id,element_id,configuration)
);
create table if not exists public.cad_snapshots (
 id uuid primary key default gen_random_uuid(),
 source_id uuid not null references public.cad_sources(id),
 microversion text not null check(microversion ~ '^[a-f0-9]{24}$'),
 evidence jsonb not null,
 coverage jsonb not null,
 created_at timestamptz not null default now(),
 unique(source_id,microversion)
);
alter table public.cad_connections enable row level security;
alter table public.cad_oauth_states enable row level security;
alter table public.cad_sources enable row level security;
alter table public.cad_snapshots enable row level security;
revoke all on public.cad_connections,public.cad_oauth_states,public.cad_sources,public.cad_snapshots from anon,authenticated;
grant all on public.cad_connections,public.cad_oauth_states,public.cad_sources,public.cad_snapshots to service_role;
-- One worker rotates credentials at a time. The lock outlasts the provider timeout.
create or replace function public.claim_cad_refresh(p_id uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
 update cad_connections set refresh_lock_until=now()+interval '60 seconds'
 where id=p_id and disconnected_at is null and (refresh_lock_until is null or refresh_lock_until<now());
 return found;
end $$;
revoke all on function public.claim_cad_refresh(uuid) from public,anon,authenticated;
grant execute on function public.claim_cad_refresh(uuid) to service_role;
commit;
