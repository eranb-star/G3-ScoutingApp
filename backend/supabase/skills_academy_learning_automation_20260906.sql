-- G3 Skills Academy learning automation and immutable progression history.
-- Safe to run repeatedly after skills_academy_gradebook_20260906.sql.
begin;

create table if not exists public.training_progress_events(
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.training_enrollments(id) on delete cascade,
  assessment_id uuid references public.training_assessments(id) on delete cascade,
  submission_id uuid references public.training_assessment_submissions(id) on delete cascade,
  member_id uuid not null references public.team_members(id) on delete cascade,
  event_type text not null check(event_type in('assigned','started','submitted','changes_requested','passed','failed','qualified','reopened')),
  from_status text,
  to_status text,
  score numeric(7,2),
  attempt_number integer,
  details text,
  created_at timestamptz not null default now()
);
create unique index if not exists training_progress_event_submission_unique
  on public.training_progress_events(submission_id,event_type) where submission_id is not null;
create unique index if not exists training_progress_event_enrollment_unique
  on public.training_progress_events(enrollment_id,event_type) where submission_id is null and event_type in('assigned','qualified');
create index if not exists training_progress_events_member_idx on public.training_progress_events(member_id,created_at desc);
create index if not exists training_progress_events_enrollment_idx on public.training_progress_events(enrollment_id,created_at desc);
create index if not exists training_assessment_assignments_member_idx on public.training_assessment_assignments(member_id,created_at desc);
create index if not exists training_enrollments_status_due_idx on public.training_enrollments(status,due_at) where status<>'qualified';
create index if not exists training_assessments_due_idx on public.training_assessments(due_at) where active and required;

alter table public.training_progress_events enable row level security;
drop policy if exists "members view relevant training progress events" on public.training_progress_events;
create policy "members view relevant training progress events" on public.training_progress_events for select to authenticated using(
  member_id=auth.uid() or public.has_permission('validate_training') or exists(
    select 1 from public.training_enrollments e join public.training_courses c on c.id=e.course_id
    where e.id=enrollment_id and public.has_permission('manage_training',c.target_subteam)
  )
);

create or replace function public.record_training_enrollment_progress() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if tg_op='INSERT' then
    insert into public.training_progress_events(enrollment_id,member_id,event_type,to_status,details)
    values(new.id,new.member_id,'assigned',new.status,'Course assigned') on conflict do nothing;
  elsif old.status is distinct from new.status then
    insert into public.training_progress_events(enrollment_id,member_id,event_type,from_status,to_status,details)
    values(new.id,new.member_id,case when new.status='qualified' then 'qualified' when old.status='qualified' then 'reopened' else 'started' end,old.status,new.status,'Enrollment status changed')
    on conflict do nothing;
  end if;
  return new;
end$$;
drop trigger if exists training_enrollment_progress_history on public.training_enrollments;
create trigger training_enrollment_progress_history after insert or update of status on public.training_enrollments
for each row execute function public.record_training_enrollment_progress();

create or replace function public.record_training_submission_progress() returns trigger
language plpgsql security definer set search_path=public as $$
declare a public.training_assessments;event_name text;attempts_used integer;
begin
  select * into a from public.training_assessments where id=new.assessment_id;
  select count(*) into attempts_used from public.training_assessment_submissions where assessment_id=new.assessment_id and enrollment_id=new.enrollment_id;
  event_name:=case
    when new.status='changes_requested' then 'changes_requested'
    when new.status='submitted' then 'submitted'
    when new.status='reviewed' and (not a.graded or a.passing_score is null or new.score>=a.passing_score) then 'passed'
    else 'failed' end;
  insert into public.training_progress_events(enrollment_id,assessment_id,submission_id,member_id,event_type,from_status,to_status,score,attempt_number,details)
  values(new.enrollment_id,new.assessment_id,new.id,new.member_id,event_name,case when tg_op='UPDATE' then old.status else null end,new.status,new.score,new.attempt_number,new.feedback)
  on conflict(submission_id,event_type) where submission_id is not null do update set to_status=excluded.to_status,score=excluded.score,attempt_number=excluded.attempt_number,details=excluded.details,created_at=now();

  update public.team_actions action set
    title=case when event_name='changes_requested' then 'Changes requested · '||a.title when event_name='failed' and attempts_used<a.max_attempts then 'Retry available · '||a.title else action.title end,
    details=case when event_name='changes_requested' then coalesce(new.feedback,'Review the feedback and submit a new attempt.') when event_name='failed' and attempts_used<a.max_attempts then coalesce(new.feedback,'Review the course and try again.') else action.details end,
    priority=case when event_name in('changes_requested','failed') then 'high' else action.priority end,
    cancelled=event_name='passed'
  from public.training_assessment_assignments assignment
  where assignment.assessment_id=new.assessment_id and assignment.enrollment_id=new.enrollment_id
    and action.source_table='training_assessment_assignments' and action.source_id=assignment.id;
  return new;
end$$;
drop trigger if exists training_submission_progress_history on public.training_assessment_submissions;
create trigger training_submission_progress_history after insert or update of status,score,feedback on public.training_assessment_submissions
for each row execute function public.record_training_submission_progress();

create or replace function public.refresh_my_training_reminders()
returns integer language plpgsql security definer set search_path=public as $$
declare changed integer:=0;
begin
  update public.team_actions action set
    title=case when assessment.due_at<now() then 'Overdue · '||assessment.title when assessment.due_at<=now()+interval '3 days' then 'Due soon · '||assessment.title else assessment.title end,
    details=assessment.instructions,
    priority=case when assessment.due_at<now() then 'urgent' when assessment.due_at<=now()+interval '3 days' then 'high' else 'normal' end,
    due_at=assessment.due_at,
    cancelled=exists(
      select 1 from public.training_assessment_submissions submission
      where submission.assessment_id=assessment.id and submission.enrollment_id=assignment.enrollment_id and submission.status='reviewed'
        and (not assessment.graded or assessment.passing_score is null or submission.score>=assessment.passing_score)
    )
  from public.training_assessment_assignments assignment join public.training_assessments assessment on assessment.id=assignment.assessment_id
  where action.source_table='training_assessment_assignments' and action.source_id=assignment.id
    and assignment.member_id=auth.uid() and assessment.active and assessment.required
    and not exists(select 1 from public.training_assessment_submissions submission where submission.assessment_id=assessment.id and submission.enrollment_id=assignment.enrollment_id and submission.status='changes_requested');
  get diagnostics changed=row_count;
  return changed;
end$$;
revoke all on function public.refresh_my_training_reminders() from public;
grant execute on function public.refresh_my_training_reminders() to authenticated;

insert into public.training_progress_events(enrollment_id,member_id,event_type,to_status,details)
select id,member_id,'assigned',status,'Course assigned' from public.training_enrollments on conflict do nothing;
commit;
