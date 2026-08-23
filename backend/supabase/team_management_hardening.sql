-- Preferences, audit coverage, reporting views, and operational indexes.
create or replace function public.set_my_language(next_language text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if next_language not in ('en','he') then raise exception 'Unsupported language'; end if;
  update public.team_members set language=next_language, updated_at=now() where id=auth.uid() and active=true;
  if not found then raise exception 'Active member not found'; end if;
end; $$;
grant execute on function public.set_my_language(text) to authenticated;

create or replace function public.audit_team_change() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.audit_log(actor_id,action,entity_type,entity_id,details)
  values(auth.uid(),lower(tg_op),tg_table_name,coalesce(new.id,old.id)::text,
    jsonb_build_object('before',case when tg_op='INSERT' then null else to_jsonb(old) end,'after',case when tg_op='DELETE' then null else to_jsonb(new) end));
  return coalesce(new,old);
end; $$;
drop trigger if exists audit_projects on public.team_projects; create trigger audit_projects after insert or update or delete on public.team_projects for each row execute function public.audit_team_change();
drop trigger if exists audit_tasks on public.project_tasks; create trigger audit_tasks after insert or update or delete on public.project_tasks for each row execute function public.audit_team_change();
drop trigger if exists audit_tools on public.workshop_tools; create trigger audit_tools after insert or update or delete on public.workshop_tools for each row execute function public.audit_team_change();
drop trigger if exists audit_checkouts on public.tool_checkouts; create trigger audit_checkouts after insert or update or delete on public.tool_checkouts for each row execute function public.audit_team_change();

create index if not exists projects_status_due_idx on public.team_projects(status,due_at);
create index if not exists tasks_project_status_idx on public.project_tasks(project_id,status);
create index if not exists tasks_assignee_due_idx on public.project_tasks(assignee_id,due_at);
create index if not exists checkouts_member_open_idx on public.tool_checkouts(member_id) where returned_at is null;
create index if not exists announcements_published_idx on public.announcements(published_at desc) where not archived;
create index if not exists attendance_member_time_idx on public.attendance_records(member_id,checked_in_at desc);

create or replace view public.team_operations_summary with (security_invoker=true) as
select
 (select count(*) from public.team_members where active) active_members,
 (select count(*) from public.team_projects where status in ('planning','active','blocked')) open_projects,
 (select count(*) from public.project_tasks where status <> 'done') open_tasks,
 (select count(*) from public.tool_checkouts where returned_at is null) tools_checked_out,
 (select count(*) from public.tool_maintenance where status <> 'resolved') maintenance_items;
grant select on public.team_operations_summary to authenticated;

drop policy if exists "admins update maintenance" on public.tool_maintenance;
create policy "admins update maintenance" on public.tool_maintenance for update to authenticated using(public.is_admin()) with check(public.is_admin());
