begin;
alter table public.cad_sources add column if not exists requirements text not null default '';
alter table public.cad_sources add column if not exists revision integer not null default 1;
create table if not exists public.cad_reviews (
 id uuid primary key default gen_random_uuid(),snapshot_id uuid not null references public.cad_snapshots(id),
 member_id uuid not null references public.team_members(id),request_id uuid not null unique,
 question text not null,requirements text not null,answer text not null,citations jsonb not null default '[]',
 created_at timestamptz not null default now()
);
alter table public.cad_reviews add column if not exists validation_note text not null default '';
create table if not exists public.cad_findings (
 id uuid primary key default gen_random_uuid(),source_id uuid not null references public.cad_sources(id),
 snapshot_id uuid not null references public.cad_snapshots(id),review_id uuid references public.cad_reviews(id),
 title text not null,description text not null default '',
 status text not null default 'open' check(status in ('open','proposed_fix','awaiting_verification','resolved','accepted')),
 resolution text not null default '',resolution_snapshot_id uuid references public.cad_snapshots(id),revision integer not null default 1,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
alter table public.cad_reviews enable row level security;
alter table public.cad_findings enable row level security;
revoke all on public.cad_reviews,public.cad_findings from anon,authenticated;
grant all on public.cad_reviews,public.cad_findings to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('cad-design-assets','cad-design-assets',false,32000000,array['application/json']) on conflict(id) do nothing;
commit;
