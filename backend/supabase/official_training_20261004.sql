-- Official training: private reusable evidence. Does not write to FIRST.
begin;
create table if not exists public.training_official_catalog (
 course_id uuid primary key references public.training_courses(id),
 provider text not null default 'FIRST', provider_key text not null unique,
 official_title text not null, launch_url text not null check(launch_url ~ '^https://(www\.)?(firstinspires\.org|training\.firstinspires\.org)/'),
 source_url text not null, language text not null default 'English',
 applicability text not null default 'No automatic seasonal expiry', active boolean not null default true
);
create table if not exists public.training_certificates (
 id uuid primary key default gen_random_uuid(), course_id uuid not null references public.training_official_catalog(course_id),
 member_id uuid not null references public.team_members(id), completed_on date not null check(completed_on>=date '1990-01-01'),
 certificate_number text not null default '' check(length(certificate_number)<=200),
 object_paths text[] not null check(cardinality(object_paths) between 1 and 3),
 status text not null default 'submitted' check(status in ('submitted','verified','changes_requested','withdrawn')),
 feedback text not null default '', reviewed_by uuid references public.team_members(id), reviewed_at timestamptz,
 created_at timestamptz not null default now(), request_id uuid not null unique
);
create unique index if not exists training_certificate_current on public.training_certificates(member_id,course_id) where status in ('submitted','verified');
create table if not exists public.training_certificate_reviews (
 id uuid primary key default gen_random_uuid(), certificate_id uuid not null references public.training_certificates(id),
 decision text not null, feedback text not null, reviewer_id uuid not null references public.team_members(id), created_at timestamptz not null default now()
);
create table if not exists public.training_official_equivalences (
 id uuid primary key default gen_random_uuid(), course_id uuid not null references public.training_official_catalog(course_id),
 assessment_id uuid not null references public.training_assessments(id), rationale text not null, source_url text not null,
 approved_by uuid not null references public.team_members(id), created_at timestamptz not null default now(),
 unique(course_id,assessment_id)
);
create table if not exists public.training_official_coverage (
 parent_course uuid not null references public.training_official_catalog(course_id),
 child_course uuid not null references public.training_official_catalog(course_id),
 source_url text not null,primary key(parent_course,child_course),check(parent_course<>child_course)
);
alter table public.training_official_coverage enable row level security;
drop policy if exists official_coverage_read on public.training_official_coverage;
create policy official_coverage_read on public.training_official_coverage for select to authenticated using(auth.uid() is not null);
revoke all on public.training_official_coverage from public,anon,authenticated;
grant select on public.training_official_coverage to authenticated;
alter table public.training_official_catalog enable row level security;
alter table public.training_certificates enable row level security;
alter table public.training_certificate_reviews enable row level security;
alter table public.training_official_equivalences enable row level security;
drop policy if exists official_catalog_read on public.training_official_catalog;
create policy official_catalog_read on public.training_official_catalog for select to authenticated using(auth.uid() is not null);
drop policy if exists certificates_read on public.training_certificates;
create policy certificates_read on public.training_certificates for select to authenticated using(member_id=auth.uid() or public.has_permission('validate_training'));
drop policy if exists certificate_reviews_read on public.training_certificate_reviews;
create policy certificate_reviews_read on public.training_certificate_reviews for select to authenticated using(exists(select 1 from public.training_certificates c where c.id=certificate_id));
drop policy if exists equivalences_read on public.training_official_equivalences;
create policy equivalences_read on public.training_official_equivalences for select to authenticated using(auth.uid() is not null);
revoke all on public.training_official_catalog,public.training_certificates,public.training_certificate_reviews,public.training_official_equivalences from anon,authenticated;
grant select on public.training_official_catalog,public.training_certificates,public.training_certificate_reviews,public.training_official_equivalences to authenticated;

create or replace view public.training_official_completions with (security_invoker=true) as
 select id certificate_id,member_id,course_id,status from public.training_certificates
 union select c.id,c.member_id,m.child_course,c.status from public.training_certificates c join public.training_official_coverage m on m.parent_course=c.course_id;
grant select on public.training_official_completions to authenticated;
create or replace view public.training_official_credits with (security_invoker=true) as
 select c.member_id,e.assessment_id,c.certificate_id,e.rationale from public.training_official_completions c
 join public.training_official_equivalences e on e.course_id=c.course_id
 join public.training_assessments a on a.id=e.assessment_id and a.active and a.assessment_type='quiz' where c.status='verified';
grant select on public.training_official_credits to authenticated;

create or replace function public.refresh_training_qualification(target_enrollment uuid)
returns void language plpgsql security definer set search_path=public as $$
declare e public.training_enrollments; mt integer; md integer; atotal integer; ad integer; desired text;
begin
 select * into e from public.training_enrollments where id=target_enrollment;
 if e.id is null then return; end if;
 if exists(select 1 from public.training_official_catalog where course_id=e.course_id) then
  select case when status='verified' then 'qualified' else 'submitted' end into desired from public.training_official_completions where course_id=e.course_id and member_id=e.member_id and status in ('submitted','verified') order by status='verified' desc limit 1;
  desired:=coalesce(desired,'assigned');
 else
  select count(*) into mt from public.training_modules where course_id=e.course_id;
  select count(distinct module_id) into md from public.training_evidence where enrollment_id=e.id and status='approved';
  select count(*) into atotal from public.training_assessments where course_id=e.course_id and active and required;
  select count(*) into ad from public.training_assessments a where a.course_id=e.course_id and a.active and a.required and (
   exists(select 1 from public.training_assessment_submissions s where s.assessment_id=a.id and s.enrollment_id=e.id and s.status='reviewed' and(not a.graded or a.passing_score is null or s.score>=a.passing_score))
   or (a.assessment_type='quiz' and exists(select 1 from public.training_official_credits cr where cr.assessment_id=a.id and cr.member_id=e.member_id)));
  desired:=case when mt+atotal>0 and md>=mt and ad>=atotal then 'qualified' when md>0 or ad>0 or exists(select 1 from public.training_assessment_submissions where enrollment_id=e.id) then 'in_progress' else 'assigned' end;
 end if;
 if e.status is distinct from desired then update public.training_enrollments set status=desired where id=e.id; end if;
end$$;
revoke all on function public.refresh_training_qualification(uuid) from public,anon,authenticated;

create or replace function public.refresh_official_member(target_member uuid) returns void language plpgsql security definer set search_path=public as $$
declare item record;
begin
 for item in select id from public.training_enrollments where member_id=target_member loop perform public.refresh_training_qualification(item.id);end loop;
 update public.team_actions a set cancelled=true where a.source_table='training_enrollments' and exists(select 1 from public.training_enrollments e join public.training_official_catalog c on c.course_id=e.course_id where e.id=a.source_id and e.member_id=target_member and e.status in ('submitted','qualified'));
 update public.team_actions a set cancelled=true where a.source_table='training_assessment_assignments' and exists(select 1 from public.training_assessment_assignments x join public.training_official_credits cr on cr.assessment_id=x.assessment_id and cr.member_id=x.member_id where x.id=a.source_id and x.member_id=target_member);
 update public.team_actions a set cancelled=true where a.source_table='official_certificate_feedback' and exists(select 1 from public.training_certificates old_certificate join public.training_official_completions current_certificate on current_certificate.course_id=old_certificate.course_id and current_certificate.member_id=old_certificate.member_id and current_certificate.status in ('submitted','verified') where old_certificate.id=a.source_id and old_certificate.member_id=target_member);
end$$;
revoke all on function public.refresh_official_member(uuid) from public,anon,authenticated;

create or replace function public.submit_training_certificate(target_course uuid, completion_date date, identifier text, files text[], submission_key uuid)
returns uuid language plpgsql security definer set search_path=public,storage as $$
declare result uuid; path text;
begin
 if auth.uid() is null or not exists(select 1 from public.team_members where id=auth.uid() and active) then raise exception 'Active membership required';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||target_course::text,0));
 select id into result from public.training_certificates where request_id=submission_key and member_id=auth.uid();if result is not null then return result;end if;
 if not exists(select 1 from public.training_official_catalog where course_id=target_course and active) then raise exception 'Official course unavailable';end if;
 if completion_date is null or completion_date>current_date or completion_date<date '1990-01-01' then raise exception 'Enter a valid completion date';end if;
 if coalesce(cardinality(files),0) not between 1 and 3 then raise exception 'Attach one to three certificate pages';end if;
 if exists(select 1 from public.training_official_completions where member_id=auth.uid() and course_id=target_course and status in ('submitted','verified')) then raise exception 'Your certificate is already pending or verified. Open its existing record.';end if;
 foreach path in array files loop
  if path not like auth.uid()::text||'/%' or not exists(select 1 from storage.objects where bucket_id='training-certificates' and name=path) then raise exception 'Certificate upload is missing or belongs to another member';end if;
 end loop;
 insert into public.training_certificates(course_id,member_id,completed_on,certificate_number,object_paths,request_id) values(target_course,auth.uid(),completion_date,coalesce(identifier,''),files,submission_key) returning id into result;
 perform public.refresh_official_member(auth.uid());
 return result;
end$$;

create or replace function public.review_training_certificate(target_certificate uuid, decision text, review_feedback text, checks boolean[] default '{}')
returns void language plpgsql security definer set search_path=public as $$
declare c public.training_certificates;
begin
 if not public.has_permission('validate_training') then raise exception 'Certificate review permission required';end if;
 select * into c from public.training_certificates where id=target_certificate for update;
 if c.id is null then raise exception 'Certificate unavailable';end if;
 if c.member_id=auth.uid() then raise exception 'Another reviewer must verify your certificate';end if;
 if decision not in ('verified','changes_requested','withdrawn') or length(trim(coalesce(review_feedback,'')))<8 then raise exception 'Choose a decision and give specific feedback';end if;
 if (decision='withdrawn' and c.status<>'verified') or (decision<>'withdrawn' and c.status<>'submitted') then raise exception 'This evidence has already been reviewed. Refresh the record.';end if;
 if decision='verified' and (cardinality(checks)<>4 or checks is null or array_position(checks,false) is not null or array_position(checks,null) is not null) then raise exception 'Confirm identity, course, completion date and applicability';end if;
 insert into public.training_certificate_reviews(certificate_id,decision,feedback,reviewer_id) values(c.id,decision,trim(review_feedback),auth.uid());
 update public.training_certificates set status=decision,feedback=trim(review_feedback),reviewed_by=auth.uid(),reviewed_at=now() where id=c.id;
 perform public.refresh_official_member(c.member_id);
end$$;

create or replace function public.approve_training_equivalence(official_course uuid, target_assessment uuid, reason text, evidence_source text)
returns void language plpgsql security definer set search_path=public as $$
declare scope text;r record;
begin
 select c.target_subteam into scope from public.training_assessments a join public.training_courses c on c.id=a.course_id where a.id=target_assessment and a.assessment_type='quiz' and a.active;
 if not found then raise exception 'Only active theory quizzes can receive equivalence. Practical work remains required.';end if;
 if not public.has_permission('validate_training') or not public.has_permission('manage_training',scope) then raise exception 'Course management and review permissions required';end if;
 if length(trim(coalesce(reason,'')))<20 or evidence_source !~ '^https://' then raise exception 'Document the matching objectives and their authoritative source';end if;
 insert into public.training_official_equivalences(course_id,assessment_id,rationale,source_url,approved_by) values(official_course,target_assessment,reason,evidence_source,auth.uid()) on conflict(course_id,assessment_id) do nothing;
 for r in select distinct member_id from public.training_official_completions where course_id=official_course and status='verified' loop perform public.refresh_official_member(r.member_id);end loop;
end$$;

create or replace function public.assign_official_training(target_course uuid,members uuid[],deadline date default null, preview boolean default true)
returns table(member_id uuid,outcome text) language plpgsql security definer set search_path=public as $$
declare c public.training_courses;m uuid;state text;eid uuid;allowed boolean;
begin
 select * into c from public.training_courses where id=target_course and active;
 if c.id is null or not exists(select 1 from public.training_official_catalog where course_id=c.id and active) or not (public.has_permission('manage_training',c.target_subteam) or exists(select 1 from public.team_members actor cross join lateral unnest(actor.leader_subteams) as scope where actor.id=auth.uid() and public.has_permission('manage_training',scope))) then raise exception 'Official course assignment permission required';end if;
 if coalesce(cardinality(members),0) not between 1 and 300 then raise exception 'Select one to 300 members';end if;
 for m in select distinct unnest(members) loop
  perform pg_advisory_xact_lock(hashtextextended(m::text||target_course::text,0));
  state:=null;eid:=null;
  select public.has_permission('manage_training',c.target_subteam) or exists(select 1 from unnest(coalesce(t.subteams,'{}'::text[])||array[t.subteam]) as scope where public.has_permission('manage_training',scope)) into allowed from public.team_members t where t.id=m and t.active;
  if not coalesce(allowed,false) then state:='unavailable';else
   select status into state from public.training_official_completions tc where tc.member_id=m and tc.course_id=target_course and status in ('verified','submitted') order by status='verified' desc limit 1;
   select id into eid from public.training_enrollments te where te.member_id=m and te.course_id=target_course;
   state:=case when state='verified' then 'already_verified' when state='submitted' then 'awaiting_review' when eid is not null then 'already_assigned' else 'new_assignment' end;
   if not preview and eid is null and state<>'already_verified' then
    insert into public.training_enrollments(course_id,member_id,assigned_by,due_at) values(target_course,m,auth.uid(),deadline) returning id into eid;
    perform public.refresh_official_member(m);
   end if;
  end if;
  member_id:=m;outcome:=state;return next;
 end loop;
end$$;
revoke all on function public.submit_training_certificate(uuid,date,text,text[],uuid),public.review_training_certificate(uuid,text,text,boolean[]),public.approve_training_equivalence(uuid,uuid,text,text),public.assign_official_training(uuid,uuid[],date,boolean) from public,anon;
grant execute on function public.submit_training_certificate(uuid,date,text,text[],uuid),public.review_training_certificate(uuid,text,text,boolean[]),public.approve_training_equivalence(uuid,uuid,text,text),public.assign_official_training(uuid,uuid[],date,boolean) to authenticated;

insert into public.training_courses(id,title,description,domain,target_subteam,required,active,sort_order) values
 ('67402026-1004-4000-8000-000000000001','FIRST · Introduction to FRC','Complete official training on FIRST, then submit your completion certificate for G3 verification.','strategy',null,false,true,90),
 ('67402026-1004-4000-8000-000000000008','FIRST · Design and Mechanical','Official FIRST learning with reusable certificate evidence. Practical demonstrations remain separate.','mechanical',null,false,true,91),
 ('67402026-1004-4000-8000-000000000009','FIRST · Electrical and Programming','Official FIRST learning with reusable certificate evidence. Practical demonstrations remain separate.','electrical',null,false,true,92)
 on conflict(id) do nothing;
update public.training_courses set title=case id::text
 when '67402026-1004-4000-8000-000000000001' then E'FIRST · Intro to FRC\n---HE---\nFIRST · מבוא ל־FRC'
 when '67402026-1004-4000-8000-000000000008' then E'FIRST · Design and Mechanical\n---HE---\nFIRST · תכן ומכניקה'
 else E'FIRST · Electrical and Programming\n---HE---\nFIRST · חשמל ותכנות' end,
 description=E'Complete official training on FIRST, then submit your certificate here. Prior completion counts; practical work stays separate.\n---HE---\nהשלימו הכשרה רשמית ב־FIRST והגישו כאן את התעודה. השלמה קודמת מוכרת; עבודה מעשית נבדקת בנפרד.'
 where id in ('67402026-1004-4000-8000-000000000001','67402026-1004-4000-8000-000000000008','67402026-1004-4000-8000-000000000009');
insert into public.training_official_catalog(course_id,provider_key,official_title,launch_url,source_url) values
 ('67402026-1004-4000-8000-000000000001','first-guided-experience-module-01','Intro to FIRST Robotics Competition','https://training.firstinspires.org/catalog','https://www.firstinspires.org/hubfs/lms/frc-guided-experience/general/frc-ge-course-overview.pdf?hsLang=en'),
 ('67402026-1004-4000-8000-000000000008','first-guided-experience-module-08','Design and Mechanical','https://training.firstinspires.org/catalog','https://www.firstinspires.org/hubfs/lms/frc-guided-experience/general/frc-ge-course-overview.pdf?hsLang=en'),
 ('67402026-1004-4000-8000-000000000009','first-guided-experience-module-09','Electrical and Programming','https://training.firstinspires.org/catalog','https://www.firstinspires.org/hubfs/lms/frc-guided-experience/general/frc-ge-course-overview.pdf?hsLang=en') on conflict(course_id) do nothing;

insert into public.training_courses(id,title,description,domain,required,active,sort_order) values
 ('67402026-1004-4000-8000-000000000099',E'FIRST · Complete Guided Experience pathway\n---HE---\nFIRST · מסלול ההכשרה המלא',E'For an existing full-path completion certificate. Includes all twelve official modules; you do not need to repeat covered pilot courses.\n---HE---\nלתעודת השלמת המסלול המלא הכולל את כל 12 היחידות הרשמיות. אין צורך לחזור על קורסי הפיילוט הכלולים בו.','strategy',false,true,93) on conflict(id) do nothing;
insert into public.training_official_catalog(course_id,provider_key,official_title,launch_url,source_url) values
 ('67402026-1004-4000-8000-000000000099','first-guided-experience-full-path','FIRST Robotics Competition Guided Experience — full training path','https://training.firstinspires.org/catalog','https://www.firstinspires.org/hubfs/lms/frc-guided-experience/general/frc-ge-course-overview.pdf?hsLang=en') on conflict(course_id) do nothing;
insert into public.training_official_coverage(parent_course,child_course,source_url)
 select '67402026-1004-4000-8000-000000000099',course_id,source_url from public.training_official_catalog where course_id in ('67402026-1004-4000-8000-000000000001','67402026-1004-4000-8000-000000000008','67402026-1004-4000-8000-000000000009') on conflict do nothing;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('training-certificates','training-certificates',false,5242880,array['image/png']) on conflict(id) do nothing;
drop policy if exists certificate_private_read on storage.objects;
create policy certificate_private_read on storage.objects for select to authenticated using(bucket_id='training-certificates' and (split_part(name,'/',1)=auth.uid()::text or (public.has_permission('validate_training') and exists(select 1 from public.training_certificates c where name=any(c.object_paths)))));
drop policy if exists certificate_bucket_boundary on storage.objects;
create policy certificate_bucket_boundary on storage.objects as restrictive for all to anon,authenticated
 using(bucket_id<>'training-certificates' or (auth.uid() is not null and (split_part(name,'/',1)=auth.uid()::text or (public.has_permission('validate_training') and exists(select 1 from public.training_certificates c where name=any(c.object_paths))))))
 with check(bucket_id<>'training-certificates');
-- Writes only through certificate-upload, which decodes/re-encodes bounded PNGs.

-- Keep existing reminder implementation and layer certificate suppression over it.
do $$begin
 if to_regprocedure('public.refresh_training_reminders_before_official()') is null and to_regprocedure('public.refresh_my_training_reminders()') is not null
 and pg_get_functiondef(to_regprocedure('public.refresh_my_training_reminders()')) not like '%refresh_official_member%' then
  alter function public.refresh_my_training_reminders() rename to refresh_training_reminders_before_official;
 end if;
 if to_regprocedure('public.refresh_training_reminders_before_official()') is not null then revoke all on function public.refresh_training_reminders_before_official() from public,anon,authenticated;end if;
end$$;
create or replace function public.refresh_my_training_reminders() returns integer language plpgsql security definer set search_path=public as $$
declare changed integer:=0;
begin
 if auth.uid() is null then return 0;end if;
 if to_regprocedure('public.refresh_training_reminders_before_official()') is not null then execute 'select public.refresh_training_reminders_before_official()' into changed;end if;
 perform public.refresh_official_member(auth.uid());return changed;
end$$;
revoke all on function public.refresh_my_training_reminders() from public,anon;
grant execute on function public.refresh_my_training_reminders() to authenticated;

create or replace function public.official_certificate_actions() returns trigger language plpgsql security definer set search_path=public as $$
declare reviewer record; title_value text;
begin
 select official_title into title_value from public.training_official_catalog where course_id=new.course_id;
 if new.status='submitted' then
  for reviewer in select m.id from public.team_members m join public.role_permissions rp on rp.role=m.role and rp.permission_key='validate_training' and rp.allowed where m.active and m.id<>new.member_id loop
   insert into public.team_actions(title,details,action_type,target_type,target_value,priority,source_table,source_id,destination,created_by,cancelled)
   values('Certificate review · '||title_value,'Review completion evidence in Skills Academy.','training','member',reviewer.id::text,'normal','official_review_'||reviewer.id,new.id,'/growth?view=review&instructor=1',new.member_id,false)
   on conflict(source_table,source_id) where source_table is not null and source_id is not null do nothing;
  end loop;
 else
  update public.team_actions set cancelled=true where source_id=new.id and source_table like 'official_review_%';
  insert into public.team_actions(title,details,action_type,target_type,target_value,priority,source_table,source_id,destination,created_by,cancelled)
  values(case when new.status='verified' then 'Certificate verified · ' else 'Certificate feedback · ' end||title_value,new.feedback,'training','member',new.member_id::text,'normal','official_certificate_feedback',new.id,'/growth?view=content&course='||new.course_id,new.reviewed_by,new.status='verified')
  on conflict(source_table,source_id) where source_table is not null and source_id is not null do update set title=excluded.title,details=excluded.details,cancelled=excluded.cancelled;
 end if;
 return new;
end$$;
drop trigger if exists official_certificate_actions on public.training_certificates;
create trigger official_certificate_actions after insert or update of status on public.training_certificates for each row execute function public.official_certificate_actions();

create or replace function public.official_enrollment_credit() returns trigger language plpgsql security definer set search_path=public as $$
begin
 perform public.refresh_training_qualification(new.id);
 return new;
end$$;
drop trigger if exists official_enrollment_credit on public.training_enrollments;
create trigger official_enrollment_credit after insert on public.training_enrollments for each row execute function public.official_enrollment_credit();
commit;
