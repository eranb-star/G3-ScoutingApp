-- G3 Skills Academy: secure quiz keys, attempts, due dates and server-side grading.
-- Safe to run repeatedly after skills_academy_assessments_20260905.sql.
begin;

alter table public.training_assessments add column if not exists due_at timestamptz;
alter table public.training_assessments add column if not exists max_attempts integer not null default 1;
alter table public.training_assessments drop constraint if exists training_assessments_max_attempts_check;
alter table public.training_assessments add constraint training_assessments_max_attempts_check check(max_attempts between 1 and 10);

alter table public.training_assessment_submissions add column if not exists attempt_number integer not null default 1;
alter table public.training_assessment_submissions drop constraint if exists training_assessment_submissions_assessment_id_enrollment_id_key;
create unique index if not exists training_submission_attempt_unique
  on public.training_assessment_submissions(assessment_id,enrollment_id,attempt_number);

create table if not exists public.training_assessment_answer_keys(
  assessment_id uuid primary key references public.training_assessments(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  updated_by uuid references public.team_members(id) on delete set null default auth.uid(),
  updated_at timestamptz not null default now()
);
alter table public.training_assessment_answer_keys enable row level security;

create table if not exists public.training_assessment_assignments(
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.training_assessments(id) on delete cascade,
  enrollment_id uuid not null references public.training_enrollments(id) on delete cascade,
  member_id uuid not null references public.team_members(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(assessment_id,enrollment_id)
);
alter table public.training_assessment_assignments enable row level security;
drop policy if exists "members view assigned assessments" on public.training_assessment_assignments;
create policy "members view assigned assessments" on public.training_assessment_assignments for select to authenticated
using(member_id=auth.uid() or public.has_permission('validate_training') or exists(
  select 1 from public.training_assessments a join public.training_courses c on c.id=a.course_id
  where a.id=assessment_id and public.has_permission('manage_training',c.target_subteam)
));

drop policy if exists "instructors view quiz keys" on public.training_assessment_answer_keys;
create policy "instructors view quiz keys" on public.training_assessment_answer_keys for select to authenticated
using(public.has_permission('validate_training') or exists(
  select 1 from public.training_assessments a join public.training_courses c on c.id=a.course_id
  where a.id=assessment_id and public.has_permission('manage_training',c.target_subteam)
));
drop policy if exists "instructors manage quiz keys" on public.training_assessment_answer_keys;
create policy "instructors manage quiz keys" on public.training_assessment_answer_keys for all to authenticated
using(public.has_permission('validate_training') or exists(
  select 1 from public.training_assessments a join public.training_courses c on c.id=a.course_id
  where a.id=assessment_id and public.has_permission('manage_training',c.target_subteam)
)) with check(public.has_permission('validate_training') or exists(
  select 1 from public.training_assessments a join public.training_courses c on c.id=a.course_id
  where a.id=assessment_id and public.has_permission('manage_training',c.target_subteam)
));

create or replace function public.submit_training_quiz(
  target_assessment uuid,target_enrollment uuid,submitted_answers jsonb,
  submitted_response text default '',submitted_resource_url text default null
) returns public.training_assessment_submissions
language plpgsql security definer set search_path=public as $$
declare
  a public.training_assessments; e public.training_enrollments; k jsonb; q jsonb;
  attempt_count integer; next_attempt integer; earned numeric:=0; possible numeric:=0;
  answer jsonb; expected jsonb; has_written boolean:=false; fully_automatic boolean:=true;
  result public.training_assessment_submissions;
begin
  select * into a from public.training_assessments where id=target_assessment and active;
  select * into e from public.training_enrollments where id=target_enrollment and member_id=auth.uid() and course_id=a.course_id;
  if a.id is null or e.id is null then raise exception 'Assessment is not assigned to this member'; end if;
  if a.assessment_type<>'quiz' then raise exception 'Assessment is not a quiz'; end if;
  if a.due_at is not null and now()>a.due_at then raise exception 'Assessment due date has passed'; end if;
  select count(*),coalesce(max(attempt_number),0)+1 into attempt_count,next_attempt
    from public.training_assessment_submissions where assessment_id=a.id and enrollment_id=e.id;
  if attempt_count>=a.max_attempts then raise exception 'No quiz attempts remaining'; end if;
  select answers into k from public.training_assessment_answer_keys where assessment_id=a.id;
  if k is null then raise exception 'Quiz answer key is not configured'; end if;
  for q in select * from jsonb_array_elements(a.questions) loop
    possible:=possible+coalesce((q->>'points')::numeric,1);
    answer:=submitted_answers->(q->>'id'); expected:=k->(q->>'id');
    if q->>'kind'='written' then has_written:=true;fully_automatic:=false;
    elsif q->>'kind'='single_choice' and expected is not null and answer=expected->0 then earned:=earned+coalesce((q->>'points')::numeric,1);
    elsif q->>'kind'='multiple_choice' and expected is not null and answer=expected then earned:=earned+coalesce((q->>'points')::numeric,1);
    end if;
  end loop;
  insert into public.training_assessment_submissions(assessment_id,enrollment_id,member_id,response,answers,resource_url,status,score,feedback,submitted_at,reviewed_at,attempt_number)
  values(a.id,e.id,auth.uid(),coalesce(submitted_response,''),coalesce(submitted_answers,'{}'::jsonb),submitted_resource_url,
    case when a.graded and fully_automatic then 'reviewed' else 'submitted' end,
    case when a.graded then earned else null end,
    case when a.graded and fully_automatic then case when a.passing_score is null or earned>=a.passing_score then 'Automatically graded · passed' else 'Automatically graded · review the course and try again if attempts remain' end else null end,
    now(),case when a.graded and fully_automatic then now() else null end,next_attempt)
  returning * into result;
  return result;
end$$;
revoke all on function public.submit_training_quiz(uuid,uuid,jsonb,text,text) from public;
grant execute on function public.submit_training_quiz(uuid,uuid,jsonb,text,text) to authenticated;

create or replace function public.publish_training_assessment_assignments(target_assessment uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  insert into public.training_assessment_assignments(assessment_id,enrollment_id,member_id)
  select a.id,e.id,e.member_id from public.training_assessments a
  join public.training_enrollments e on e.course_id=a.course_id
  where a.id=target_assessment and a.active and a.required and e.status not in('qualified','archived')
  on conflict(assessment_id,enrollment_id) do nothing;

  insert into public.team_actions(title,details,action_type,target_type,target_value,due_at,priority,source_table,source_id,destination,created_by,cancelled)
  select a.title,a.instructions,'training','member',x.member_id::text,a.due_at,
    case when a.due_at is not null and a.due_at<now()+interval '3 days' then 'high' else 'normal' end,
    'training_assessment_assignments',x.id,'/growth?view=assessments&assessment='||a.id,a.created_by,not a.active
  from public.training_assessment_assignments x join public.training_assessments a on a.id=x.assessment_id
  where x.assessment_id=target_assessment
  on conflict(source_table,source_id) where source_table is not null and source_id is not null
  do update set title=excluded.title,details=excluded.details,due_at=excluded.due_at,
    priority=excluded.priority,target_value=excluded.target_value,cancelled=excluded.cancelled;
end$$;

create or replace function public.sync_training_assessment_assignment_actions()
returns trigger language plpgsql security definer set search_path=public as $$
begin perform public.publish_training_assessment_assignments(new.id);return new;end$$;
drop trigger if exists training_assessment_to_assignments on public.training_assessments;
create trigger training_assessment_to_assignments after insert or update on public.training_assessments
for each row execute function public.sync_training_assessment_assignment_actions();

create or replace function public.sync_enrollment_assessment_actions()
returns trigger language plpgsql security definer set search_path=public as $$
declare row record;
begin
  for row in select id from public.training_assessments where course_id=new.course_id and active and required loop
    perform public.publish_training_assessment_assignments(row.id);
  end loop;
  return new;
end$$;
drop trigger if exists enrollment_to_assessment_assignments on public.training_enrollments;
create trigger enrollment_to_assessment_assignments after insert or update on public.training_enrollments
for each row execute function public.sync_enrollment_assessment_actions();

create or replace function public.complete_training_assessment_action()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status='reviewed' and exists(
    select 1 from public.training_assessments a where a.id=new.assessment_id
      and (not a.graded or a.passing_score is null or new.score>=a.passing_score)
  ) then
    update public.team_actions a set cancelled=true
    from public.training_assessment_assignments x
    where x.assessment_id=new.assessment_id and x.enrollment_id=new.enrollment_id
      and a.source_table='training_assessment_assignments' and a.source_id=x.id;
  end if;
  return new;
end$$;
drop trigger if exists assessment_submission_completes_action on public.training_assessment_submissions;
create trigger assessment_submission_completes_action after insert or update on public.training_assessment_submissions
for each row execute function public.complete_training_assessment_action();

-- Move any answer keys created by the earlier prototype out of student-readable JSON.
do $$
declare a record;q jsonb;clean jsonb;keys jsonb;i integer;qid text;kind text;
begin
  for a in select id,questions from public.training_assessments where assessment_type='quiz' loop
    clean:='[]'::jsonb;keys:='{}'::jsonb;i:=0;
    for q in select * from jsonb_array_elements(a.questions) loop
      i:=i+1;qid:=coalesce(q->>'id','legacy-'||i);
      kind:=case when q->>'kind'='free_text' then 'written' when q->>'kind'='multiple_choice' then 'single_choice' else coalesce(q->>'kind','written') end;
      if q ? 'correct_answer' and length(coalesce(q->>'correct_answer',''))>0 then
        keys:=jsonb_set(keys,array[qid],jsonb_build_array(q->>'correct_answer'),true);
      elsif q ? 'correct_answers' then keys:=jsonb_set(keys,array[qid],q->'correct_answers',true);
      end if;
      q:=(q-'correct_answer'-'correct_answers')||jsonb_build_object('id',qid,'kind',kind);
      clean:=clean||jsonb_build_array(q);
    end loop;
    if keys<>'{}'::jsonb then
      insert into public.training_assessment_answer_keys(assessment_id,answers) values(a.id,keys)
      on conflict(assessment_id) do update set answers=excluded.answers,updated_at=now();
    end if;
    update public.training_assessments set questions=clean where id=a.id and questions is distinct from clean;
  end loop;
end$$;

do $$ declare row record; begin
  for row in select id from public.training_assessments where active and required loop
    perform public.publish_training_assessment_assignments(row.id);
  end loop;
end$$;

commit;
