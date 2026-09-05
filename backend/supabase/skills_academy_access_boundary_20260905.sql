-- Skills Academy integrity: students submit their own work; authorized
-- instructors alone validate evidence, award qualifications and grade work.
begin;

drop policy if exists "members create own assessment submissions" on public.training_assessment_submissions;
create policy "members create own assessment submissions" on public.training_assessment_submissions
for insert to authenticated
with check(
  member_id=auth.uid()
  and status in ('draft','submitted')
  and score is null and feedback is null and reviewed_by is null and reviewed_at is null
  and exists(
    select 1 from public.training_enrollments e
    where e.id=enrollment_id and e.member_id=auth.uid() and e.course_id=(
      select a.course_id from public.training_assessments a where a.id=assessment_id
    )
  )
);

create or replace function public.protect_training_submission_review_fields()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if public.has_permission('validate_training') then return new; end if;
  if new.member_id is distinct from old.member_id
     or new.assessment_id is distinct from old.assessment_id
     or new.enrollment_id is distinct from old.enrollment_id
     or new.score is distinct from old.score
     or new.feedback is distinct from old.feedback
     or new.reviewed_by is distinct from old.reviewed_by
     or new.reviewed_at is distinct from old.reviewed_at
     or new.status not in ('draft','submitted') then
    raise exception 'Only an authorized instructor can review or grade work';
  end if;
  return new;
end$$;
drop trigger if exists protect_training_submission_review_fields on public.training_assessment_submissions;
create trigger protect_training_submission_review_fields
before update on public.training_assessment_submissions
for each row execute function public.protect_training_submission_review_fields();

create or replace function public.protect_training_qualification()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if public.has_permission('manage_training') or public.has_permission('validate_training') or pg_trigger_depth()>1 then return new; end if;
  if new.member_id is distinct from old.member_id
     or new.course_id is distinct from old.course_id
     or new.assigned_by is distinct from old.assigned_by
     or new.due_at is distinct from old.due_at
     or old.status='qualified'
     or new.status not in ('in_progress','submitted') then
    raise exception 'Only an authorized instructor can change enrollment or qualification details';
  end if;
  return new;
end$$;
drop trigger if exists protect_training_qualification on public.training_enrollments;
create trigger protect_training_qualification
before update on public.training_enrollments
for each row execute function public.protect_training_qualification();

commit;
