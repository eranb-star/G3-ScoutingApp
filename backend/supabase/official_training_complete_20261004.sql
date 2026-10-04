-- Complete numbered FIRST Guided Experience catalogue. Live provider pages verified 4 October 2026.
-- Reuses existing identities, evidence, assignments, review and qualification. Creates no enrollments.
begin;
insert into public.training_courses(id,title,description,domain,required,active,sort_order) values('67402026-1004-4000-8000-000000000002','FIRST · How Do FIRST Robotics Competition Robots Work?
---HE---
FIRST · איך פועלים רובוטי FRC?','Complete this module on FIRST, then submit its certificate here. Verified prior completion counts; practical demonstrations remain separate.
---HE---
השלימו את היחידה ב־FIRST והגישו כאן את תעודתה. השלמה קודמת מאומתת מוכרת; הדגמות מעשיות נבדקות בנפרד.','mechanical',false,true,92) on conflict(id) do nothing;
insert into public.training_official_catalog(course_id,provider_key,official_title,launch_url,source_url) values('67402026-1004-4000-8000-000000000002','first-guided-experience-module-02','How Do FIRST Robotics Competition Robots Work?','https://training.firstinspires.org/courses/module-2-how-do-first-robotics-competition-robots-work','https://training.firstinspires.org/courses/module-2-how-do-first-robotics-competition-robots-work') on conflict(course_id) do nothing;
insert into public.training_courses(id,title,description,domain,required,active,sort_order) values('67402026-1004-4000-8000-000000000003','FIRST · Intro to CAD and 3D Printing
---HE---
FIRST · מבוא ל־CAD ולהדפסת תלת־ממד','Complete this module on FIRST, then submit its certificate here. Verified prior completion counts; practical demonstrations remain separate.
---HE---
השלימו את היחידה ב־FIRST והגישו כאן את תעודתה. השלמה קודמת מאומתת מוכרת; הדגמות מעשיות נבדקות בנפרד.','mechanical',false,true,93) on conflict(id) do nothing;
insert into public.training_official_catalog(course_id,provider_key,official_title,launch_url,source_url) values('67402026-1004-4000-8000-000000000003','first-guided-experience-module-03','Intro to CAD and 3D Printing','https://training.firstinspires.org/courses/module-3-intro-to-cad-and-3d-printing','https://training.firstinspires.org/courses/module-3-intro-to-cad-and-3d-printing') on conflict(course_id) do nothing;
insert into public.training_courses(id,title,description,domain,required,active,sort_order) values('67402026-1004-4000-8000-000000000004','FIRST · Fabrication Tools and Safety
---HE---
FIRST · כלי ייצור ובטיחות','Complete this module on FIRST, then submit its certificate here. Verified prior completion counts; practical demonstrations remain separate.
---HE---
השלימו את היחידה ב־FIRST והגישו כאן את תעודתה. השלמה קודמת מאומתת מוכרת; הדגמות מעשיות נבדקות בנפרד.','mechanical',false,true,94) on conflict(id) do nothing;
insert into public.training_official_catalog(course_id,provider_key,official_title,launch_url,source_url) values('67402026-1004-4000-8000-000000000004','first-guided-experience-module-04','Fabrication Tools and Safety','https://training.firstinspires.org/courses/module-4-fabrication-tools-and-safety','https://training.firstinspires.org/courses/module-4-fabrication-tools-and-safety') on conflict(course_id) do nothing;
insert into public.training_courses(id,title,description,domain,required,active,sort_order) values('67402026-1004-4000-8000-000000000005','FIRST · Rapid Prototyping
---HE---
FIRST · בניית אבות־טיפוס מהירה','Complete this module on FIRST, then submit its certificate here. Verified prior completion counts; practical demonstrations remain separate.
---HE---
השלימו את היחידה ב־FIRST והגישו כאן את תעודתה. השלמה קודמת מאומתת מוכרת; הדגמות מעשיות נבדקות בנפרד.','mechanical',false,true,95) on conflict(id) do nothing;
insert into public.training_official_catalog(course_id,provider_key,official_title,launch_url,source_url) values('67402026-1004-4000-8000-000000000005','first-guided-experience-module-05','Rapid Prototyping','https://training.firstinspires.org/courses/module-5-rapid-prototyping','https://training.firstinspires.org/courses/module-5-rapid-prototyping') on conflict(course_id) do nothing;
insert into public.training_courses(id,title,description,domain,required,active,sort_order) values('67402026-1004-4000-8000-000000000006','FIRST · Preparing for Build Season
---HE---
FIRST · הכנה לעונת הבנייה','Complete this module on FIRST, then submit its certificate here. Verified prior completion counts; practical demonstrations remain separate.
---HE---
השלימו את היחידה ב־FIRST והגישו כאן את תעודתה. השלמה קודמת מאומתת מוכרת; הדגמות מעשיות נבדקות בנפרד.','strategy',false,true,96) on conflict(id) do nothing;
insert into public.training_official_catalog(course_id,provider_key,official_title,launch_url,source_url) values('67402026-1004-4000-8000-000000000006','first-guided-experience-module-06','Preparing for Build Season','https://training.firstinspires.org/courses/module-6-preparing-for-build-season','https://training.firstinspires.org/courses/module-6-preparing-for-build-season') on conflict(course_id) do nothing;
insert into public.training_courses(id,title,description,domain,required,active,sort_order) values('67402026-1004-4000-8000-000000000007','FIRST · Kickoff: Game and Robot Strategy
---HE---
FIRST · קיקאוף: אסטרטגיית משחק ורובוט','Complete this module on FIRST, then submit its certificate here. Verified prior completion counts; practical demonstrations remain separate.
---HE---
השלימו את היחידה ב־FIRST והגישו כאן את תעודתה. השלמה קודמת מאומתת מוכרת; הדגמות מעשיות נבדקות בנפרד.','strategy',false,true,97) on conflict(id) do nothing;
insert into public.training_official_catalog(course_id,provider_key,official_title,launch_url,source_url) values('67402026-1004-4000-8000-000000000007','first-guided-experience-module-07','Kickoff: Game and Robot Strategy','https://training.firstinspires.org/courses/module-7-kickoff-game-and-robot-strategy','https://training.firstinspires.org/courses/module-7-kickoff-game-and-robot-strategy') on conflict(course_id) do nothing;
insert into public.training_courses(id,title,description,domain,required,active,sort_order) values('67402026-1004-4000-8000-000000000010','FIRST · Business, Awards, Marketing, and Media
---HE---
FIRST · ניהול, פרסים, שיווק ומדיה','Complete this module on FIRST, then submit its certificate here. Verified prior completion counts; practical demonstrations remain separate.
---HE---
השלימו את היחידה ב־FIRST והגישו כאן את תעודתה. השלמה קודמת מאומתת מוכרת; הדגמות מעשיות נבדקות בנפרד.','strategy',false,true,100) on conflict(id) do nothing;
insert into public.training_official_catalog(course_id,provider_key,official_title,launch_url,source_url) values('67402026-1004-4000-8000-000000000010','first-guided-experience-module-10','Business, Awards, Marketing, and Media','https://training.firstinspires.org/courses/module-10-business-awards-marketing-and-media','https://training.firstinspires.org/courses/module-10-business-awards-marketing-and-media') on conflict(course_id) do nothing;
insert into public.training_courses(id,title,description,domain,required,active,sort_order) values('67402026-1004-4000-8000-000000000011','FIRST · Preparing for Competition
---HE---
FIRST · הכנה לתחרות','Complete this module on FIRST, then submit its certificate here. Verified prior completion counts; practical demonstrations remain separate.
---HE---
השלימו את היחידה ב־FIRST והגישו כאן את תעודתה. השלמה קודמת מאומתת מוכרת; הדגמות מעשיות נבדקות בנפרד.','strategy',false,true,101) on conflict(id) do nothing;
insert into public.training_official_catalog(course_id,provider_key,official_title,launch_url,source_url) values('67402026-1004-4000-8000-000000000011','first-guided-experience-module-11','Preparing for Competition','https://training.firstinspires.org/courses/module-11-preparing-for-competition','https://training.firstinspires.org/courses/module-11-preparing-for-competition') on conflict(course_id) do nothing;
insert into public.training_courses(id,title,description,domain,required,active,sort_order) values('67402026-1004-4000-8000-000000000012','FIRST · End of Season Activities
---HE---
FIRST · פעילויות סיום העונה','Complete this module on FIRST, then submit its certificate here. Verified prior completion counts; practical demonstrations remain separate.
---HE---
השלימו את היחידה ב־FIRST והגישו כאן את תעודתה. השלמה קודמת מאומתת מוכרת; הדגמות מעשיות נבדקות בנפרד.','strategy',false,true,102) on conflict(id) do nothing;
insert into public.training_official_catalog(course_id,provider_key,official_title,launch_url,source_url) values('67402026-1004-4000-8000-000000000012','first-guided-experience-module-12','End of Season Activities','https://training.firstinspires.org/courses/module-12-end-of-season-activities','https://training.firstinspires.org/courses/module-12-end-of-season-activities') on conflict(course_id) do nothing;
-- Preserve existing course identities; put all twelve modules in their actual numbered order.
update public.training_courses c set sort_order=90+substring(o.provider_key from 'module-([0-9]+)$')::integer from public.training_official_catalog o where o.course_id=c.id and o.provider_key ~ '^first-guided-experience-module-[0-9]+$';
update public.training_courses set sort_order=113 where id='67402026-1004-4000-8000-000000000099';
-- FIRST marks modules 1–7, 11 and 12 required; 8, 9 and 10 optional.
insert into public.training_official_coverage(parent_course,child_course,source_url,enabled) values('67402026-1004-4000-8000-000000000099','67402026-1004-4000-8000-000000000001','https://training.firstinspires.org/learning-paths/first-robotics-competition-guided-experience',true) on conflict(parent_course,child_course) do update set source_url=excluded.source_url,enabled=excluded.enabled;
insert into public.training_official_coverage(parent_course,child_course,source_url,enabled) values('67402026-1004-4000-8000-000000000099','67402026-1004-4000-8000-000000000002','https://training.firstinspires.org/learning-paths/first-robotics-competition-guided-experience',true) on conflict(parent_course,child_course) do update set source_url=excluded.source_url,enabled=excluded.enabled;
insert into public.training_official_coverage(parent_course,child_course,source_url,enabled) values('67402026-1004-4000-8000-000000000099','67402026-1004-4000-8000-000000000003','https://training.firstinspires.org/learning-paths/first-robotics-competition-guided-experience',true) on conflict(parent_course,child_course) do update set source_url=excluded.source_url,enabled=excluded.enabled;
insert into public.training_official_coverage(parent_course,child_course,source_url,enabled) values('67402026-1004-4000-8000-000000000099','67402026-1004-4000-8000-000000000004','https://training.firstinspires.org/learning-paths/first-robotics-competition-guided-experience',true) on conflict(parent_course,child_course) do update set source_url=excluded.source_url,enabled=excluded.enabled;
insert into public.training_official_coverage(parent_course,child_course,source_url,enabled) values('67402026-1004-4000-8000-000000000099','67402026-1004-4000-8000-000000000005','https://training.firstinspires.org/learning-paths/first-robotics-competition-guided-experience',true) on conflict(parent_course,child_course) do update set source_url=excluded.source_url,enabled=excluded.enabled;
insert into public.training_official_coverage(parent_course,child_course,source_url,enabled) values('67402026-1004-4000-8000-000000000099','67402026-1004-4000-8000-000000000006','https://training.firstinspires.org/learning-paths/first-robotics-competition-guided-experience',true) on conflict(parent_course,child_course) do update set source_url=excluded.source_url,enabled=excluded.enabled;
insert into public.training_official_coverage(parent_course,child_course,source_url,enabled) values('67402026-1004-4000-8000-000000000099','67402026-1004-4000-8000-000000000007','https://training.firstinspires.org/learning-paths/first-robotics-competition-guided-experience',true) on conflict(parent_course,child_course) do update set source_url=excluded.source_url,enabled=excluded.enabled;
insert into public.training_official_coverage(parent_course,child_course,source_url,enabled) values('67402026-1004-4000-8000-000000000099','67402026-1004-4000-8000-000000000008','https://training.firstinspires.org/learning-paths/first-robotics-competition-guided-experience',false) on conflict(parent_course,child_course) do update set source_url=excluded.source_url,enabled=excluded.enabled;
insert into public.training_official_coverage(parent_course,child_course,source_url,enabled) values('67402026-1004-4000-8000-000000000099','67402026-1004-4000-8000-000000000009','https://training.firstinspires.org/learning-paths/first-robotics-competition-guided-experience',false) on conflict(parent_course,child_course) do update set source_url=excluded.source_url,enabled=excluded.enabled;
insert into public.training_official_coverage(parent_course,child_course,source_url,enabled) values('67402026-1004-4000-8000-000000000099','67402026-1004-4000-8000-000000000010','https://training.firstinspires.org/learning-paths/first-robotics-competition-guided-experience',false) on conflict(parent_course,child_course) do update set source_url=excluded.source_url,enabled=excluded.enabled;
insert into public.training_official_coverage(parent_course,child_course,source_url,enabled) values('67402026-1004-4000-8000-000000000099','67402026-1004-4000-8000-000000000011','https://training.firstinspires.org/learning-paths/first-robotics-competition-guided-experience',true) on conflict(parent_course,child_course) do update set source_url=excluded.source_url,enabled=excluded.enabled;
insert into public.training_official_coverage(parent_course,child_course,source_url,enabled) values('67402026-1004-4000-8000-000000000099','67402026-1004-4000-8000-000000000012','https://training.firstinspires.org/learning-paths/first-robotics-competition-guided-experience',true) on conflict(parent_course,child_course) do update set source_url=excluded.source_url,enabled=excluded.enabled;
do $$declare r record;begin for r in select distinct member_id from public.training_certificates where course_id='67402026-1004-4000-8000-000000000099' loop perform public.refresh_official_member(r.member_id);end loop;end$$;
commit;
