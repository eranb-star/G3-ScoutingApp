-- G3 6740 unified responsibility engine.
-- Keeps Home and Work aligned with the underlying source records.
-- Safe to run repeatedly after the earlier team hub migrations.
begin;

alter table public.team_actions add column if not exists destination text;

drop index if exists public.team_actions_source_unique;
delete from public.team_actions older using public.team_actions newer
where older.source_table=newer.source_table and older.source_id=newer.source_id
  and older.source_table is not null and older.source_id is not null
  and (older.created_at,older.id)<(newer.created_at,newer.id);
create unique index team_actions_source_unique
  on public.team_actions(source_table, source_id)
  where source_table is not null and source_id is not null;

alter table public.team_actions drop constraint if exists team_actions_action_type_check;
alter table public.team_actions add constraint team_actions_action_type_check
  check(action_type in ('assignment','milestone','announcement','training','meeting','robot_issue','maintenance','other'));

create or replace function public.sync_team_action(
  p_source_table text,
  p_source_id uuid,
  p_title text,
  p_details text,
  p_action_type text,
  p_target_type text,
  p_target_value text,
  p_due_at timestamptz,
  p_priority text,
  p_destination text,
  p_created_by uuid,
  p_cancelled boolean default false
) returns void language plpgsql security definer set search_path=public as $$
begin
  insert into public.team_actions(title,details,action_type,target_type,target_value,due_at,priority,source_table,source_id,destination,created_by,cancelled)
  values(p_title,p_details,p_action_type,p_target_type,p_target_value,p_due_at,p_priority,p_source_table,p_source_id,p_destination,p_created_by,p_cancelled)
  on conflict(source_table,source_id) where source_table is not null and source_id is not null
  do update set title=excluded.title,details=excluded.details,action_type=excluded.action_type,target_type=excluded.target_type,
    target_value=excluded.target_value,due_at=excluded.due_at,priority=excluded.priority,destination=excluded.destination,
    cancelled=excluded.cancelled;
end$$;

create or replace function public.sync_project_task_action() returns trigger language plpgsql security definer set search_path=public as $$
declare project_name text; project_status text;
begin
  select name,status into project_name,project_status from public.team_projects where id=new.project_id;
  perform public.sync_team_action('project_tasks',new.id,new.title,project_name,'assignment','member',new.assignee_id::text,
    new.due_at,new.priority,'/projects?project='||new.project_id||'&task='||new.id,new.created_by,
    new.archived or new.status='done' or new.assignee_id is null or project_status='archived');
  return new;
end$$;
drop trigger if exists project_task_to_action on public.project_tasks;
create trigger project_task_to_action after insert or update on public.project_tasks for each row execute function public.sync_project_task_action();

create or replace function public.sync_project_actions_on_archive() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status='archived' or (old.status='archived' and new.status<>'archived') then
    update public.team_actions a set cancelled=(new.status='archived')
    from public.project_tasks t where a.source_table='project_tasks' and a.source_id=t.id and t.project_id=new.id
      and (new.status='archived' or (not t.archived and t.status<>'done' and t.assignee_id is not null));
  end if;
  return new;
end$$;
drop trigger if exists project_archive_to_actions on public.team_projects;
create trigger project_archive_to_actions after update of status on public.team_projects for each row execute function public.sync_project_actions_on_archive();

create or replace function public.sync_training_action() returns trigger language plpgsql security definer set search_path=public as $$
declare course_title text; course_description text;
begin
  select title,description into course_title,course_description from public.training_courses where id=new.course_id;
  perform public.sync_team_action('training_enrollments',new.id,course_title,course_description,'training','member',new.member_id::text,
    case when new.due_at is null then null else new.due_at::timestamptz+interval '20 hours' end,
    'normal','/growth?course='||new.course_id,new.assigned_by,new.status='qualified');
  return new;
end$$;
drop trigger if exists training_enrollment_to_action on public.training_enrollments;
create trigger training_enrollment_to_action after insert or update on public.training_enrollments for each row execute function public.sync_training_action();

create or replace function public.qualify_completed_training() returns trigger language plpgsql security definer set search_path=public as $$
declare total_modules integer; approved_modules integer; enrollment_course uuid;
begin
  if new.status='approved' then
    select course_id into enrollment_course from public.training_enrollments where id=new.enrollment_id;
    select count(*) into total_modules from public.training_modules where course_id=enrollment_course;
    select count(*) into approved_modules from public.training_evidence where enrollment_id=new.enrollment_id and status='approved';
    if total_modules>0 and approved_modules>=total_modules then
      update public.training_enrollments set status='qualified' where id=new.enrollment_id and status<>'qualified';
    end if;
  elsif old.status='approved' and new.status<>'approved' then
    update public.training_enrollments set status='in_progress' where id=new.enrollment_id and status='qualified';
  end if;
  return new;
end$$;
drop trigger if exists evidence_qualifies_enrollment on public.training_evidence;
create trigger evidence_qualifies_enrollment after update of status on public.training_evidence for each row execute function public.qualify_completed_training();

create or replace function public.sync_competition_assignment_action() returns trigger language plpgsql security definer set search_path=public as $$
declare match_label text; match_number_value integer;
begin
  select match_type,match_number into match_label,match_number_value from public.matches where id=new.match_id;
  perform public.sync_team_action('competition_assignments',new.id,
    coalesce(upper(match_label)||' '||match_number_value::text,'Competition role')||' · '||replace(new.role,'_',' '),new.notes,
    'assignment','member',new.member_id::text,null,case when new.status='replacement_requested' then 'high' else 'normal' end,
    '/competition?assignment='||new.id,new.assigned_by,new.status in ('completed','absent'));
  return new;
end$$;
drop trigger if exists competition_assignment_to_action on public.competition_assignments;
create trigger competition_assignment_to_action after insert or update on public.competition_assignments for each row execute function public.sync_competition_assignment_action();

create or replace function public.sync_calendar_action() returns trigger language plpgsql security definer set search_path=public as $$
begin
  perform public.sync_team_action('team_calendar_events',new.id,new.title,new.description,'meeting',new.target_type,new.target_value,
    new.starts_at,case when new.mandatory then 'high' else 'normal' end,'/schedule?event='||new.id,new.created_by,
    new.cancelled or not new.mandatory or new.ends_at<now());
  return new;
end$$;
drop trigger if exists calendar_event_to_action on public.team_calendar_events;
create trigger calendar_event_to_action after insert or update on public.team_calendar_events for each row execute function public.sync_calendar_action();

create or replace function public.sync_robot_issue_action() returns trigger language plpgsql security definer set search_path=public as $$
begin
  perform public.sync_team_action('robot_issues',new.id,new.title,new.description,'robot_issue','member',new.owner_id::text,null,
    case when new.severity='critical' then 'urgent' when new.severity='high' or new.status='blocked' then 'high' else 'normal' end,
    '/robot-issues?issue='||new.id,new.reporter_id,new.archived or new.status='resolved' or new.owner_id is null);
  return new;
end$$;
drop trigger if exists robot_issue_to_action on public.robot_issues;
create trigger robot_issue_to_action after insert or update on public.robot_issues for each row execute function public.sync_robot_issue_action();

-- Replace insert-only milestone behavior with synchronized behavior.
create or replace function public.publish_milestone_action() returns trigger language plpgsql security definer set search_path=public as $$
begin
  perform public.sync_team_action('season_milestones',new.id,new.title,new.details,'milestone',
    case when new.owner_id is not null then 'member' when new.workstream='team' then 'all' else 'subteam' end,
    case when new.owner_id is not null then new.owner_id::text when new.workstream='team' then null else new.workstream end,
    case when new.due_at is null then null else new.due_at::timestamptz+interval '17 hours' end,
    case when new.status in ('blocked','at_risk') then 'high' else 'normal' end,
    '/season-planning?milestone='||new.id,new.created_by,new.status='completed');
  return new;
end$$;
drop trigger if exists season_milestone_to_action on public.season_milestones;
create trigger season_milestone_to_action after insert or update on public.season_milestones for each row execute function public.publish_milestone_action();

create or replace function public.publish_urgent_announcement_action() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.priority in ('important','urgent','high') and coalesce(new.audience,'all') in ('all','subteam') then
    perform public.sync_team_action('announcements',new.id,new.title,new.body,'announcement',
      case when new.audience='subteam' then 'subteam' else 'all' end,
      case when new.audience='subteam' then new.audience_subteam else null end,null,
      case when new.priority='urgent' then 'urgent' else 'high' end,
      '/updates?view=announcements&announcement='||new.id,new.created_by,new.archived);
  else
    update public.team_actions set cancelled=true where source_table='announcements' and source_id=new.id;
  end if;
  return new;
end$$;
drop trigger if exists urgent_announcement_to_action on public.announcements;
create trigger urgent_announcement_to_action after insert or update on public.announcements for each row execute function public.publish_urgent_announcement_action();

-- Backfill/synchronize existing records by making their normal triggers run.
update public.project_tasks set updated_at=updated_at;
update public.training_enrollments set status=status;
update public.competition_assignments set status=status;
update public.team_calendar_events set cancelled=cancelled;
update public.robot_issues set updated_at=updated_at;
update public.season_milestones set updated_at=updated_at;
update public.announcements set archived=archived;

commit;
