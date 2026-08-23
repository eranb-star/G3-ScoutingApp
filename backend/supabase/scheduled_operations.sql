create table if not exists public.automation_runs (
  run_key text primary key,
  kind text not null,
  created_at timestamptz not null default now()
);
alter table public.automation_runs enable row level security;
drop policy if exists "admins view automation runs" on public.automation_runs;
create policy "admins view automation runs" on public.automation_runs for select to authenticated using(public.is_admin());
create index if not exists automation_runs_created_idx on public.automation_runs(created_at desc);
