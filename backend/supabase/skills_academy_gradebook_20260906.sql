-- G3 Skills Academy gradebook: private learner records and outcome-based qualification.
-- Safe to run repeatedly after skills_academy_quiz_engine_20260905.sql.
begin;

drop policy if exists "members view training_enrollments" on public.training_enrollments;
drop policy if exists "members view relevant training enrollments" on public.training_enrollments;
create policy "members view relevant training enrollments" on public.training_enrollments for select to authenticated using(
  member_id=auth.uid() or public.has_permission('validate_training') or exists(
    select 1 from public.training_courses c where c.id=course_id and public.has_permission('manage_training',c.target_subteam)
  )
);

drop policy if exists "members view training_evidence" on public.training_evidence;
drop policy if exists "members view relevant training evidence" on public.training_evidence;
create policy "members view relevant training evidence" on public.training_evidence for select to authenticated using(
  member_id=auth.uid() or public.has_permission('validate_training') or exists(
    select 1 from public.training_enrollments e join public.training_courses c on c.id=e.course_id
    where e.id=enrollment_id and public.has_permission('manage_training',c.target_subteam)
  )
);

create or replace function public.refresh_training_qualification(target_enrollment uuid)
returns void language plpgsql security definer set search_path=public as $$
declare e public.training_enrollments;module_total integer;module_done integer;assessment_total integer;assessment_done integer;desired text;
begin
  select * into e from public.training_enrollments where id=target_enrollment;
  if e.id is null then return; end if;
  select count(*) into module_total from public.training_modules where course_id=e.course_id;
  select count(distinct module_id) into module_done from public.training_evidence where enrollment_id=e.id and status='approved';
  select count(*) into assessment_total from public.training_assessments where course_id=e.course_id and active and required;
  select count(*) into assessment_done from public.training_assessments a where a.course_id=e.course_id and a.active and a.required and exists(
    select 1 from public.training_assessment_submissions s where s.assessment_id=a.id and s.enrollment_id=e.id and s.status='reviewed'
      and (not a.graded or a.passing_score is null or s.score>=a.passing_score)
  );
  desired:=case when module_total+assessment_total>0 and module_done>=module_total and assessment_done>=assessment_total then 'qualified'
    when module_done>0 or exists(select 1 from public.training_assessment_submissions where enrollment_id=e.id) then 'in_progress' else 'assigned' end;
  if e.status is distinct from desired then update public.training_enrollments set status=desired where id=e.id; end if;
end$$;
revoke all on function public.refresh_training_qualification(uuid) from public;

create or replace function public.refresh_training_from_evidence() returns trigger language plpgsql security definer set search_path=public as $$
begin perform public.refresh_training_qualification(coalesce(new.enrollment_id,old.enrollment_id));return coalesce(new,old);end$$;
drop trigger if exists evidence_qualifies_enrollment on public.training_evidence;
drop trigger if exists evidence_refreshes_training_qualification on public.training_evidence;
create trigger evidence_refreshes_training_qualification after insert or update or delete on public.training_evidence for each row execute function public.refresh_training_from_evidence();

create or replace function public.refresh_training_from_submission() returns trigger language plpgsql security definer set search_path=public as $$
begin perform public.refresh_training_qualification(coalesce(new.enrollment_id,old.enrollment_id));return coalesce(new,old);end$$;
drop trigger if exists submission_refreshes_training_qualification on public.training_assessment_submissions;
create trigger submission_refreshes_training_qualification after insert or update or delete on public.training_assessment_submissions for each row execute function public.refresh_training_from_submission();

create or replace function public.refresh_course_training_qualifications() returns trigger language plpgsql security definer set search_path=public as $$
declare target_course uuid;row record;
begin
  target_course:=coalesce(new.course_id,old.course_id);
  for row in select id from public.training_enrollments where course_id=target_course loop perform public.refresh_training_qualification(row.id);end loop;
  return coalesce(new,old);
end$$;
drop trigger if exists assessment_refreshes_course_qualification on public.training_assessments;
create trigger assessment_refreshes_course_qualification after insert or update or delete on public.training_assessments for each row execute function public.refresh_course_training_qualifications();
drop trigger if exists module_refreshes_course_qualification on public.training_modules;
create trigger module_refreshes_course_qualification after insert or update or delete on public.training_modules for each row execute function public.refresh_course_training_qualifications();

do $$ declare row record; begin for row in select id from public.training_enrollments loop perform public.refresh_training_qualification(row.id);end loop;end$$;
commit;
