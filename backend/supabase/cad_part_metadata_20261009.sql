-- Server-only observation cache. Imported BOM records retain their original metadata.
begin;
create table if not exists public.cad_part_metadata(
 snapshot_id uuid not null references public.cad_snapshots(id) on delete cascade,
 group_key text not null check(length(group_key)<=2300),
 parts jsonb not null check(jsonb_typeof(parts)='object'),
 observed_at timestamptz not null default now(),primary key(snapshot_id,group_key)
);
alter table public.cad_part_metadata enable row level security;
revoke all on public.cad_part_metadata from public,anon,authenticated;
grant select,insert on public.cad_part_metadata to service_role;
commit;
