begin;
-- Deliberate permanent deletion is separate from archival. Never disable triggers/RLS.
create or replace function public.admin_delete_project_task(p_task uuid) returns void
language plpgsql security definer set search_path=public as $$
begin
 if not public.is_admin() or not exists(select 1 from public.team_members where id=auth.uid() and active) then
   raise exception 'An active administrator is required' using errcode='42501';
 end if;
 perform pg_advisory_xact_lock(6740,911);
 perform 1 from public.project_tasks where id=p_task for update;
 if not found then return; end if;
 update public.project_review_gates set current_submission=null where task_id=p_task;
 delete from public.project_artifact_checks where submission_id in (select id from public.project_review_submissions where task_id=p_task);
 delete from public.project_override_requests where submission_id in (select id from public.project_review_submissions where task_id=p_task);
 delete from public.project_review_submissions where task_id=p_task;
 delete from public.project_review_audit where task_id=p_task;
 delete from public.project_review_gates where task_id=p_task;
 -- Other tasks survive; only the links to this deliberately deleted prerequisite go.
 delete from public.project_task_dependencies where prerequisite_id=p_task;
 delete from public.project_tasks where id=p_task;
 -- Existing delete triggers reconcile responsibilities; remove their retained rows too.
 delete from public.team_actions where source_id=p_task and source_table='project_tasks';
end $$;
revoke all on function public.admin_delete_project_task(uuid) from public,anon;
grant execute on function public.admin_delete_project_task(uuid) to authenticated;
commit;
