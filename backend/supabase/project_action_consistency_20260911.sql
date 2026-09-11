begin;
create or replace function public.reconcile_project_task_action(p_task uuid) returns void
language plpgsql security definer set search_path=public as $$
declare task public.project_tasks%rowtype; parent public.team_projects%rowtype;
 previous public.team_actions%rowtype; inactive boolean; v_action_id uuid;
begin
 select * into task from public.project_tasks where id=p_task;
 if not found then
 update public.team_actions set cancelled=true where source_table='project_tasks' and source_id=p_task;
 return;
 end if;
 select * into parent from public.team_projects where id=task.project_id;
 inactive=parent.id is null or parent.status='archived' or task.archived or task.status='done' or task.assignee_id is null;
 select * into previous from public.team_actions where source_table='project_tasks' and source_id=p_task;
 perform public.sync_team_action('project_tasks',task.id,task.title,parent.name,'assignment','member',task.assignee_id::text,
 task.due_at,coalesce(task.priority,'normal'),'/projects?project='||task.project_id||'&task='||task.id,task.created_by,inactive);
 -- A reopened or reassigned task is fresh responsibility for its current assignee.
 if not inactive and (previous.cancelled or previous.target_value is distinct from task.assignee_id::text) then
 select id into v_action_id from public.team_actions where source_table='project_tasks' and source_id=p_task;
 delete from public.team_action_states s where s.action_id=v_action_id and s.member_id=task.assignee_id;
 end if;
end$$;
revoke all on function public.reconcile_project_task_action(uuid) from public,anon,authenticated;
create or replace function public.sync_project_task_action() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 perform public.reconcile_project_task_action(case when tg_op='DELETE' then old.id else new.id end);
 return null;
end$$;
drop trigger if exists project_task_to_action on public.project_tasks;
create trigger project_task_to_action after insert or update or delete on public.project_tasks for each row execute function public.sync_project_task_action();
create or replace function public.sync_project_actions_on_archive() returns trigger
language plpgsql security definer set search_path=public as $$
declare task_id uuid;
begin
 for task_id in select id from public.project_tasks where project_id=new.id loop
 perform public.reconcile_project_task_action(task_id);
 end loop;return null;
end$$;
drop trigger if exists project_archive_to_actions on public.team_projects;
create trigger project_archive_to_actions after update of status,name on public.team_projects for each row execute function public.sync_project_actions_on_archive();
-- Repair old orphans and existing rows without deleting reminder history.
update public.team_actions a set cancelled=true where a.source_table='project_tasks' and not exists(select 1 from public.project_tasks t where t.id=a.source_id);
do $$declare task_id uuid;begin for task_id in select id from public.project_tasks loop perform public.reconcile_project_task_action(task_id);end loop;end$$;
commit;
