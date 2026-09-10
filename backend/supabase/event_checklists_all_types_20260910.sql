-- Extend existing checklists to every Calendar event type; retain source access and management permissions.
begin;
drop policy if exists checklist_read on public.competition_checklist_tasks;
create policy checklist_read on public.competition_checklist_tasks for select to authenticated using(
 exists(select 1 from public.team_calendar_events c where c.id=calendar_event_id and not c.cancelled)
 and exists(select 1 from public.project_tasks t join public.team_projects p on p.id=t.project_id where t.id=task_id and not t.archived and p.status<>'archived'));
drop policy if exists checklist_add on public.competition_checklist_tasks;
create policy checklist_add on public.competition_checklist_tasks for insert to authenticated with check(created_by=auth.uid() and
 exists(select 1 from public.team_calendar_events c where c.id=calendar_event_id and not c.cancelled and public.has_permission('manage_team_calendar',case when c.target_type='subteam' then c.target_value else null end))
 and exists(select 1 from public.project_tasks t join public.team_projects p on p.id=t.project_id where t.id=task_id and not t.archived and p.status<>'archived' and public.has_permission('assign_team_work',p.subteam)));
commit;
