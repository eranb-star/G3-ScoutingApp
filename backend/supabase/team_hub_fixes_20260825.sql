-- Team Hub fixes: message administration and project creation.
-- Safe to run repeatedly in the Supabase SQL editor.

drop policy if exists "admins delete announcements" on public.announcements;
create policy "admins delete announcements" on public.announcements
for delete to authenticated using (public.is_admin());

drop policy if exists "members create projects" on public.team_projects;
create policy "members create projects" on public.team_projects
for insert to authenticated
with check (
  public.current_team_role() is not null
  and created_by = auth.uid()
  and owner_id = auth.uid()
);
