begin;
-- The deployed legacy publisher auto-enrolls its audience. Curated packs instead
-- use existing, explicit course enrollments; publishing content must not assign a team.
create or replace function public.publish_learning_pack_assignments(target_course uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
 insert into public.training_assessment_assignments(assessment_id,enrollment_id,member_id)
 select a.id,e.id,e.member_id from public.training_assessments a join public.training_enrollments e on e.course_id=a.course_id
 where a.course_id=target_course and a.active and a.required on conflict(assessment_id,enrollment_id) do nothing;
 insert into public.team_actions(title,details,action_type,target_type,target_value,due_at,priority,source_table,source_id,destination,created_by,cancelled)
 select a.title,a.instructions,'training','member',x.member_id::text,a.due_at,'normal','training_assessment_assignments',x.id,
 '/growth?view=practical&course='||a.course_id,a.created_by,not a.active
 from public.training_assessment_assignments x join public.training_assessments a on a.id=x.assessment_id
 where a.course_id=target_course
 on conflict(source_table,source_id) where source_table is not null and source_id is not null
 do update set title=excluded.title,details=excluded.details,destination=excluded.destination,due_at=excluded.due_at;
end$$;
revoke all on function public.publish_learning_pack_assignments(uuid) from public,anon,authenticated;
create or replace function public.sync_training_assessment_assignment_actions() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 if exists(select 1 from public.training_lesson_packs where course_id=new.course_id) then perform public.publish_learning_pack_assignments(new.course_id);
 else perform public.publish_training_assessment_assignments(new.id);end if;
 return new;
end$$;
create or replace function public.sync_enrollment_assessment_actions() returns trigger
language plpgsql security definer set search_path=public as $$
declare a record;
begin
 if exists(select 1 from public.training_lesson_packs where course_id=new.course_id) then perform public.publish_learning_pack_assignments(new.course_id);
 else for a in select id from public.training_assessments where course_id=new.course_id and active and required loop perform public.publish_training_assessment_assignments(a.id);end loop;end if;
 return new;
end$$;
revoke all on function public.sync_training_assessment_assignment_actions() from public,anon,authenticated;
revoke all on function public.sync_enrollment_assessment_actions() from public,anon,authenticated;
create table if not exists public.training_practical_reviews (
 id uuid primary key default gen_random_uuid(),
 submission_id uuid not null references public.training_assessment_submissions(id),
 reviewer_id uuid not null default auth.uid() references public.team_members(id),
 created_at timestamptz not null default now(),
 outcome text not null check(outcome in ('reviewed','changes_requested')),
 criteria jsonb not null,
 feedback text not null check(length(trim(feedback)) between 3 and 4000)
);
alter table public.training_practical_reviews enable row level security;
revoke all on public.training_practical_reviews from anon,authenticated;
grant select on public.training_practical_reviews to authenticated;
drop policy if exists practical_review_read on public.training_practical_reviews;
create policy practical_review_read on public.training_practical_reviews for select to authenticated using(exists(
 select 1 from public.training_assessment_submissions s where s.id=submission_id
));

create or replace function public.submit_learning_pack(target_assessment uuid,target_enrollment uuid,submitted_answers jsonb,submitted_response text,submitted_resource_url text)
returns public.training_assessment_submissions language plpgsql security definer set search_path=public as $$
declare a public.training_assessments; e public.training_enrollments; result public.training_assessment_submissions; attempt integer; q jsonb; keys jsonb; earned integer:=0; missed text:='';
begin
 if public.current_team_role() is null then raise exception 'Active team membership required'; end if;
 select * into e from public.training_enrollments where id=target_enrollment and member_id=auth.uid() for update;
 select * into a from public.training_assessments where id=target_assessment and course_id=e.course_id and active;
 if a.id is null or not exists(select 1 from public.training_lesson_packs where course_id=a.course_id) then raise exception 'This lesson is not assigned to you'; end if;
 if a.due_at is not null and now()>a.due_at then raise exception 'The due date has passed; ask your instructor to extend it'; end if;
 if length(coalesce(submitted_response,''))>16000 or length(coalesce(submitted_answers,'{}')::text)>30000 then raise exception 'Submission too large'; end if;
 if submitted_resource_url is not null and (length(submitted_resource_url)>2000 or submitted_resource_url !~ '^https?://') then raise exception 'Evidence link must be an HTTP or HTTPS URL'; end if;
 select coalesce(max(attempt_number),0)+1 into attempt from public.training_assessment_submissions where assessment_id=a.id and enrollment_id=e.id;
 if attempt>a.max_attempts then raise exception 'No attempts remaining; ask your instructor to review the assessment'; end if;
 if a.assessment_type='quiz' then
  select answers into keys from public.training_assessment_answer_keys where assessment_id=a.id;
  if keys is null or jsonb_array_length(a.questions)<>10 then raise exception 'Lesson quiz configuration is incomplete'; end if;
  for q in select value from jsonb_array_elements(a.questions) loop
   if q->>'kind'<>'single_choice' or keys->(q->>'id')->0 is null then raise exception 'Unsupported lesson quiz configuration'; end if;
   if not exists(select 1 from jsonb_array_elements(q->'options') v where v=submitted_answers->(q->>'id')) then raise exception 'Answer every question using an available option'; end if;
   if submitted_answers->(q->>'id')=keys->(q->>'id')->0 then earned:=earned+1;else missed:=concat_ws(', ',nullif(missed,''),q->>'id');end if;
  end loop;
  insert into public.training_assessment_submissions(assessment_id,enrollment_id,member_id,response,answers,status,score,feedback,submitted_at,reviewed_at,attempt_number)
  values(a.id,e.id,auth.uid(),'',submitted_answers,'reviewed',earned,
    case when earned>=a.passing_score then 'Knowledge check passed / בדיקת הידע עברה. ' else 'Review the lesson and retry / חזרו לשיעור ונסו שוב. ' end || case when missed<>'' then 'Review questions / שאלות לחזרה: '||missed else '' end,
    now(),now(),attempt) returning * into result;
  return result;
 end if;
 if a.assessment_type<>'practical' then raise exception 'Unsupported lesson assessment'; end if;
 if length(trim(coalesce(submitted_response,'')))<20 then raise exception 'Describe your observations and what you demonstrated (at least 20 characters)'; end if;
 if exists(select 1 from public.training_assessment_submissions where assessment_id=a.id and enrollment_id=e.id and status='submitted') then raise exception 'Your previous demonstration is awaiting review'; end if;
 insert into public.training_assessment_submissions(assessment_id,enrollment_id,member_id,response,answers,resource_url,status,submitted_at,attempt_number)
 values(a.id,e.id,auth.uid(),trim(submitted_response),coalesce(submitted_answers,'{}'),submitted_resource_url,'submitted',now(),attempt) returning * into result;
 return result;
end$$;
revoke all on function public.submit_learning_pack(uuid,uuid,jsonb,text,text) from public,anon,authenticated;
grant execute on function public.submit_learning_pack(uuid,uuid,jsonb,text,text) to authenticated;

create or replace function public.review_learning_practical(target_submission uuid,approved boolean,checked_criteria jsonb,review_feedback text)
returns void language plpgsql security definer set search_path=public as $$
declare s public.training_assessment_submissions; a public.training_assessments; p public.training_lesson_packs; idx integer; needed integer;
begin
 if public.current_team_role() is null or not public.has_permission('validate_training') then raise exception 'Training reviewer permission required'; end if;
 select * into s from public.training_assessment_submissions where id=target_submission for update;
 select * into a from public.training_assessments where id=s.assessment_id;
 select * into p from public.training_lesson_packs where course_id=a.course_id;
 if p.course_id is null or a.assessment_type<>'practical' or s.status<>'submitted' then raise exception 'This practical is not awaiting review'; end if;
 if s.member_id=auth.uid() then raise exception 'A different responsible reviewer must review your demonstration'; end if;
 select ordinality::integer-1 into idx from jsonb_array_elements_text(p.content->'practicalIds') with ordinality where value=a.id::text;
 needed:=jsonb_array_length(p.content->'rubrics'->idx);
 if needed is null or jsonb_typeof(checked_criteria) is distinct from 'array' or jsonb_array_length(checked_criteria)<>needed then raise exception 'Review every rubric criterion'; end if;
 if exists(select 1 from jsonb_array_elements(checked_criteria) v where jsonb_typeof(v)<>'boolean') then raise exception 'Invalid criterion value'; end if;
 if approved and exists(select 1 from jsonb_array_elements(checked_criteria) v where v<>'true'::jsonb) then raise exception 'All criteria must be verified before approval'; end if;
 if length(trim(coalesce(review_feedback,''))) not between 3 and 4000 then raise exception 'Add specific feedback for the learner'; end if;
 insert into public.training_practical_reviews(submission_id,reviewer_id,outcome,criteria,feedback)
 values(s.id,auth.uid(),case when approved then 'reviewed' else 'changes_requested' end,checked_criteria,trim(review_feedback));
 update public.training_assessment_submissions set status=case when approved then 'reviewed' else 'changes_requested' end,
 feedback=trim(review_feedback),reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now() where id=s.id;
end$$;
revoke all on function public.review_learning_practical(uuid,boolean,jsonb,text) from public,anon,authenticated;
grant execute on function public.review_learning_practical(uuid,boolean,jsonb,text) to authenticated;

create or replace function public.protect_pack_practical_review() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 if exists(select 1 from public.training_assessments a join public.training_lesson_packs p on p.course_id=a.course_id where a.id=new.assessment_id and a.assessment_type='practical') then
  if new.response is distinct from old.response or new.answers is distinct from old.answers or new.resource_url is distinct from old.resource_url or new.assessment_id is distinct from old.assessment_id or new.member_id is distinct from old.member_id or new.enrollment_id is distinct from old.enrollment_id or new.attempt_number is distinct from old.attempt_number then raise exception 'Submitted demonstrations are preserved; submit a new attempt'; end if;
  if new.status is distinct from old.status and (old.status<>'submitted' or not exists(select 1 from public.training_practical_reviews r where r.submission_id=new.id and r.reviewer_id=auth.uid() and r.outcome=new.status and r.feedback=new.feedback)) then raise exception 'Use the practical rubric review to review this demonstration'; end if;
 end if;
 return new;
end$$;
revoke all on function public.protect_pack_practical_review() from public,anon,authenticated;
drop trigger if exists protect_pack_practical_review on public.training_assessment_submissions;
create trigger protect_pack_practical_review before update on public.training_assessment_submissions for each row execute function public.protect_pack_practical_review();
commit;
