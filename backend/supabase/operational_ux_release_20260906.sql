-- Operational UX release: inventory quantities and scoped Skills Academy activities.
-- Safe to run repeatedly after skills_academy_quiz_engine_20260905.sql.
begin;

alter table public.workshop_tools add column if not exists model text;
alter table public.workshop_tools add column if not exists amount integer not null default 1;
alter table public.workshop_tools drop constraint if exists workshop_tools_amount_check;
alter table public.workshop_tools add constraint workshop_tools_amount_check check (amount >= 1);
update public.workshop_tools set model=asset_tag where model is null and asset_tag is not null;

alter table public.training_assessments add column if not exists target_type text not null default 'all';
alter table public.training_assessments add column if not exists target_values text[] not null default '{}';
alter table public.training_assessments drop constraint if exists training_assessments_target_type_check;
alter table public.training_assessments add constraint training_assessments_target_type_check
  check(target_type in ('all','subteams','members'));

create or replace function public.publish_training_assessment_assignments(target_assessment uuid)
returns void language plpgsql security definer set search_path=public as $$
declare activity public.training_assessments;
begin
  select * into activity from public.training_assessments where id=target_assessment;
  if activity.id is null then return; end if;

  -- A targeted activity is part of its course, so create missing course enrollments for its recipients.
  insert into public.training_enrollments(course_id,member_id,assigned_by,due_at)
  select activity.course_id,m.id,activity.created_by,activity.due_at::date
  from public.team_members m
  where m.active and (
    activity.target_type='all'
    or activity.target_type='members' and m.id::text=any(activity.target_values)
    or activity.target_type='subteams' and exists(
      select 1 from unnest(coalesce(m.subteams,'{}'::text[]) || array[coalesce(m.subteam,'')]) team_name
      where lower(trim(team_name)) in (select lower(trim(value)) from unnest(activity.target_values) value)
    )
  ) on conflict(course_id,member_id) do update set due_at=coalesce(excluded.due_at,public.training_enrollments.due_at);

  insert into public.training_assessment_assignments(assessment_id,enrollment_id,member_id)
  select activity.id,e.id,e.member_id
  from public.training_enrollments e join public.team_members m on m.id=e.member_id
  where e.course_id=activity.course_id and activity.active and activity.required and m.active
    and e.status not in('qualified','archived') and (
      activity.target_type='all'
      or activity.target_type='members' and m.id::text=any(activity.target_values)
      or activity.target_type='subteams' and exists(
        select 1 from unnest(coalesce(m.subteams,'{}'::text[]) || array[coalesce(m.subteam,'')]) team_name
        where lower(trim(team_name)) in (select lower(trim(value)) from unnest(activity.target_values) value)
      )
    )
  on conflict(assessment_id,enrollment_id) do nothing;

  -- Remove pending assignments/actions when an instructor narrows the audience.
  update public.team_actions action set cancelled=true
  from public.training_assessment_assignments assignment
  where assignment.assessment_id=activity.id
    and action.source_table='training_assessment_assignments' and action.source_id=assignment.id
    and not exists(
      select 1 from public.team_members m where m.id=assignment.member_id and (
        activity.target_type='all'
        or activity.target_type='members' and m.id::text=any(activity.target_values)
        or activity.target_type='subteams' and exists(
          select 1 from unnest(coalesce(m.subteams,'{}'::text[]) || array[coalesce(m.subteam,'')]) team_name
          where lower(trim(team_name)) in (select lower(trim(value)) from unnest(activity.target_values) value)
        )
      )
    );

  insert into public.team_actions(title,details,action_type,target_type,target_value,due_at,priority,source_table,source_id,destination,created_by,cancelled)
  select activity.title,activity.instructions,'training','member',assignment.member_id::text,activity.due_at,
    case when activity.due_at is not null and activity.due_at<now()+interval '3 days' then 'high' else 'normal' end,
    'training_assessment_assignments',assignment.id,'/growth?view=assessments&assessment='||activity.id,activity.created_by,not activity.active
  from public.training_assessment_assignments assignment
  where assignment.assessment_id=activity.id and exists(
    select 1 from public.team_members m where m.id=assignment.member_id and (
      activity.target_type='all'
      or activity.target_type='members' and m.id::text=any(activity.target_values)
      or activity.target_type='subteams' and exists(
        select 1 from unnest(coalesce(m.subteams,'{}'::text[]) || array[coalesce(m.subteam,'')]) team_name
        where lower(trim(team_name)) in (select lower(trim(value)) from unnest(activity.target_values) value)
      )
    )
  )
  on conflict(source_table,source_id) where source_table is not null and source_id is not null
  do update set title=excluded.title,details=excluded.details,due_at=excluded.due_at,
    priority=excluded.priority,target_value=excluded.target_value,cancelled=excluded.cancelled;
end$$;

commit;
