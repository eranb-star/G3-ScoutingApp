create table if not exists public.push_tokens (
  token text primary key,
  member_id uuid not null references public.team_members(id) on delete cascade,
  platform text not null default 'android',
  active boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.push_tokens enable row level security;
drop policy if exists "members manage own push tokens" on public.push_tokens;
create policy "members manage own push tokens" on public.push_tokens for all to authenticated
using (member_id = auth.uid()) with check (member_id = auth.uid());
