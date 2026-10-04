-- Verified against FIRST's live course/path pages on 4 October 2026.
begin;
update public.training_official_catalog set
 launch_url='https://training.firstinspires.org/courses/module-1-intro-first-robotics-competition',
 source_url='https://training.firstinspires.org/courses/module-1-intro-first-robotics-competition'
 where course_id='67402026-1004-4000-8000-000000000001';
update public.training_official_catalog set
 launch_url='https://training.firstinspires.org/courses/module-8-design-mechanical',
 source_url='https://training.firstinspires.org/courses/module-8-design-mechanical'
 where course_id='67402026-1004-4000-8000-000000000008';
update public.training_official_catalog set active=false,
 launch_url='https://training.firstinspires.org/courses/module-9-coming-next-season',
 source_url='https://training.firstinspires.org/courses/module-9-coming-next-season'
 where course_id='67402026-1004-4000-8000-000000000009';
update public.training_official_catalog set
 launch_url='https://training.firstinspires.org/learning-paths/first-robotics-competition-guided-experience',
 source_url='https://training.firstinspires.org/learning-paths/first-robotics-competition-guided-experience'
 where course_id='67402026-1004-4000-8000-000000000099';
update public.training_courses set description=E'Complete the FIRST training path and submit its certificate. Optional modules need their own completion evidence.\n---HE---\nהשלימו את מסלול FIRST והגישו את תעודתו. יחידות בחירה דורשות ראיית השלמה נפרדת.'
 where id='67402026-1004-4000-8000-000000000099';

-- Keep the superseded mapping for audit. The live path marks 8 and 9 optional.
alter table public.training_official_coverage add column if not exists enabled boolean not null default true;
update public.training_official_coverage set enabled=false,
 source_url='https://training.firstinspires.org/learning-paths/first-robotics-competition-guided-experience'
 where parent_course='67402026-1004-4000-8000-000000000099'
 and child_course in ('67402026-1004-4000-8000-000000000008','67402026-1004-4000-8000-000000000009');
update public.training_official_coverage set source_url='https://training.firstinspires.org/learning-paths/first-robotics-competition-guided-experience'
 where parent_course='67402026-1004-4000-8000-000000000099' and enabled;
create or replace view public.training_official_completions with (security_invoker=true) as
 select id certificate_id,member_id,course_id,status from public.training_certificates
 union select c.id,c.member_id,m.child_course,c.status from public.training_certificates c
 join public.training_official_coverage m on m.parent_course=c.course_id and m.enabled;
do $$declare r record;begin
 for r in select distinct member_id from public.training_certificates
 where course_id='67402026-1004-4000-8000-000000000099' loop
  perform public.refresh_official_member(r.member_id);
 end loop;
end$$;
commit;
