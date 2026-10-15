begin;
alter table public.team_members drop constraint team_members_role_check;
alter table public.team_members add constraint team_members_role_check check(role in ('member','team_leader','mentor','limited_mentor','admin'));
alter table public.role_permissions drop constraint role_permissions_role_check;
alter table public.role_permissions add constraint role_permissions_role_check check(role in ('member','team_leader','mentor','limited_mentor','admin'));
insert into public.role_permissions(role,permission_key,allowed)
select 'limited_mentor',permission_key,permission_key in ('manage_team_projects','assign_team_work','view_field_twin','view_evidence_search')
from public.app_permissions on conflict(role,permission_key) do nothing;

create or replace function public.has_permission(requested_permission text,target_team text default null)
returns boolean language sql stable security definer set search_path=public as $$
 select coalesce(exists(select 1 from public.team_members m join public.role_permissions rp on rp.role=m.role and rp.permission_key=requested_permission and rp.allowed
 where m.id=auth.uid() and m.active and (
 m.role in ('admin','mentor') or
 (m.role='team_leader' and (requested_permission not in ('manage_team_projects','assign_team_work','manage_robot_reliability','manage_training','manage_team_calendar','create_announcements','manage_inventory','view_team_reports') or target_team is not null and public.current_member_leads_team(target_team))) or
 (m.role='member' and target_team is null) or
 (m.role='limited_mentor' and (
  (requested_permission in ('manage_team_projects','assign_team_work','manage_robot_reliability','submit_engineering_review') and target_team is not null and public.current_member_has_team(target_team)) or
  (requested_permission in ('view_field_twin','view_evidence_search','use_g3_assist','use_private_robot_code') and target_team is null)
 )))),false);
$$;

-- Restrictive policies intersect existing permissive policies. Existing roles
-- retain their access; this role cannot inherit the broad active-member directory.
create policy limited_mentor_own_profile on public.team_members as restrictive for select to authenticated
using(public.current_team_role() is distinct from 'limited_mentor' or id=auth.uid());
create policy limited_mentor_own_progress on public.member_skill_progress as restrictive for all to authenticated
using(public.current_team_role() is distinct from 'limited_mentor' or member_id=auth.uid())
with check(public.current_team_role() is distinct from 'limited_mentor' or member_id=auth.uid());
create policy limited_mentor_project_scope on public.team_projects as restrictive for all to authenticated
using(public.current_team_role() is distinct from 'limited_mentor' or public.current_member_has_team(subteam))
with check(public.current_team_role() is distinct from 'limited_mentor' or public.current_member_has_team(subteam));
create policy limited_mentor_task_scope on public.project_tasks as restrictive for all to authenticated
using(public.current_team_role() is distinct from 'limited_mentor' or exists(select 1 from public.team_projects p where p.id=project_id))
with check(public.current_team_role() is distinct from 'limited_mentor' or exists(select 1 from public.team_projects p where p.id=project_id));

create function public.scoped_assignee_directory()
returns table(id uuid,display_name text) language sql stable security definer set search_path=public as $$
 select m.id,m.display_name from public.team_members m where m.active and exists(select 1 from public.team_members caller where caller.id=auth.uid() and caller.active)
 and (public.current_team_role()<>'limited_mentor' or m.id=auth.uid() or exists(
 select 1 from unnest(array_append(coalesce(m.subteams,'{}'::text[]),coalesce(m.subteam,''))) t where public.current_member_has_team(t)))
 order by m.display_name,m.id;
$$;
revoke all on function public.scoped_assignee_directory() from public,anon;
grant execute on function public.scoped_assignee_directory() to authenticated;
commit;
