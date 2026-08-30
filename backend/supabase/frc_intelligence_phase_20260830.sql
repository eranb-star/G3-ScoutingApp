-- Phase 4: shared G3 FRC knowledge and grounded assistant metadata.
begin;
create table if not exists public.frc_knowledge_articles(
  id uuid primary key default gen_random_uuid(),
  title text not null check(char_length(trim(title)) between 3 and 180),
  content text not null check(char_length(trim(content)) between 10 and 20000),
  summary text,
  subsystem text not null default 'general',
  source_type text not null default 'g3_solution' check(source_type in ('g3_solution','official','vendor','chief_delphi','assistant')),
  source_url text,
  related_issue_id uuid references public.robot_issues(id) on delete set null,
  created_by uuid not null references public.team_members(id) on delete restrict default auth.uid(),
  verified boolean not null default false,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists frc_knowledge_search_idx on public.frc_knowledge_articles(subsystem,verified,updated_at desc) where not archived;
alter table public.frc_knowledge_articles enable row level security;
drop policy if exists "members view frc knowledge" on public.frc_knowledge_articles;
create policy "members view frc knowledge" on public.frc_knowledge_articles for select to authenticated using(public.current_team_role() is not null and not archived);
drop policy if exists "members create frc knowledge" on public.frc_knowledge_articles;
create policy "members create frc knowledge" on public.frc_knowledge_articles for insert to authenticated with check(created_by=auth.uid() and public.current_team_role() is not null);
drop policy if exists "authors and admins update frc knowledge" on public.frc_knowledge_articles;
create policy "authors and admins update frc knowledge" on public.frc_knowledge_articles for update to authenticated using(created_by=auth.uid() or public.is_admin()) with check(created_by=auth.uid() or public.is_admin());
drop policy if exists "admins delete frc knowledge" on public.frc_knowledge_articles;
create policy "admins delete frc knowledge" on public.frc_knowledge_articles for delete to authenticated using(public.is_admin());
alter table public.ai_messages add column if not exists citations jsonb not null default '[]'::jsonb;
alter table public.ai_messages add column if not exists context_issue_id uuid references public.robot_issues(id) on delete set null;
commit;
