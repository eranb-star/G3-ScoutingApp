-- Reviewed Skills Academy resource catalog and course attachments.
-- Idempotent: safe to run repeatedly.
begin;

create table if not exists public.training_resources(
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  provider text not null,
  url text not null unique,
  domain text not null,
  level text not null default 'all' check(level in ('beginner','intermediate','advanced','all')),
  language text not null default 'English',
  resource_type text not null default 'course' check(resource_type in ('course','pathway','documentation','video','guide','reference')),
  estimated_minutes integer check(estimated_minutes is null or estimated_minutes > 0),
  free_access boolean not null default true,
  embed_allowed boolean not null default false,
  status text not null default 'pending' check(status in ('pending','approved','retired')),
  review_note text,
  reviewed_by uuid references public.team_members(id) on delete set null,
  reviewed_at timestamptz,
  created_by uuid references public.team_members(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.training_course_resources(
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.training_courses(id) on delete cascade,
  resource_id uuid not null references public.training_resources(id) on delete cascade,
  sort_order integer not null default 100,
  note text,
  created_by uuid references public.team_members(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  unique(course_id,resource_id)
);

create index if not exists training_resources_catalog_idx on public.training_resources(status,domain,level,provider);
create index if not exists training_course_resources_course_idx on public.training_course_resources(course_id,sort_order);

alter table public.training_resources enable row level security;
alter table public.training_course_resources enable row level security;

drop policy if exists "members view approved training resources" on public.training_resources;
create policy "members view approved training resources" on public.training_resources for select to authenticated
using(status='approved' or public.is_admin());
drop policy if exists "admins create training resources" on public.training_resources;
create policy "admins create training resources" on public.training_resources for insert to authenticated
with check(public.is_admin());
drop policy if exists "admins update training resources" on public.training_resources;
create policy "admins update training resources" on public.training_resources for update to authenticated
using(public.is_admin()) with check(public.is_admin());
drop policy if exists "admins delete training resources" on public.training_resources;
create policy "admins delete training resources" on public.training_resources for delete to authenticated
using(public.is_admin());

drop policy if exists "members view course resources" on public.training_course_resources;
create policy "members view course resources" on public.training_course_resources for select to authenticated
using(exists(select 1 from public.training_resources r where r.id=resource_id and (r.status='approved' or public.is_admin())));
drop policy if exists "training managers attach resources" on public.training_course_resources;
create policy "training managers attach resources" on public.training_course_resources for insert to authenticated
with check(exists(select 1 from public.training_courses c where c.id=course_id and public.has_permission('manage_training',c.target_subteam)));
drop policy if exists "training managers update attachments" on public.training_course_resources;
create policy "training managers update attachments" on public.training_course_resources for update to authenticated
using(exists(select 1 from public.training_courses c where c.id=course_id and public.has_permission('manage_training',c.target_subteam)))
with check(exists(select 1 from public.training_courses c where c.id=course_id and public.has_permission('manage_training',c.target_subteam)));
drop policy if exists "training managers remove attachments" on public.training_course_resources;
create policy "training managers remove attachments" on public.training_course_resources for delete to authenticated
using(exists(select 1 from public.training_courses c where c.id=course_id and public.has_permission('manage_training',c.target_subteam)));

insert into public.training_resources(title,description,provider,url,domain,level,language,resource_type,free_access,embed_allowed,status,review_note,reviewed_at)
values
('FIRST Resource Library','Official FRC season, safety, awards, outreach and team-management resources.','FIRST','https://www.firstinspires.org/resources/library','onboarding','all','English','reference',true,false,'approved','Primary official source; review season-dependent items annually.',now()),
('FIRST Team Safety','Official safety manuals, training and recognition resources for creating a strong safety culture.','FIRST','https://www.firstinspires.org/resources/library/safety','safety','all','English','pathway',true,false,'approved','Required primary safety reference; local G3 procedures still govern workshop practice.',now()),
('FIRST Awards','Official award criteria, deadlines, workbooks and judging preparation resources.','FIRST','https://www.firstinspires.org/resources/library/frc/awards','awards','all','English','guide',true,false,'approved','Authoritative award requirements; verify annually.',now()),
('FIRST Team Management Resources','Official mentor onboarding, organization, fundraising, outreach and team sustainability resources.','FIRST','https://www.firstinspires.org/resources/library/frc/team-management-resources','business','all','English','pathway',true,false,'approved','Strong source for leadership and operations.',now()),
('WPILib Zero to Robot','Official setup-to-deployment learning path for the FRC control system.','WPILib','https://docs.wpilib.org/en/stable/docs/zero-to-robot/introduction.html','software','beginner','English','pathway',true,false,'approved','Official, current and suitable as the programming entry point.',now()),
('WPILib Programming Basics','Official reference for robot projects, dashboards, hardware APIs, CAN, sensors and debugging.','WPILib','https://docs.wpilib.org/en/stable/stubs/programming-basics-stub.html','software','intermediate','English','documentation',true,false,'approved','Use stable documentation and recheck each season.',now()),
('WPILib Example Projects','Official working examples from basic drivetrains through controls, simulation and vision.','WPILib','https://docs.wpilib.org/en/stable/docs/software/examples-tutorials/wpilib-examples.html','software','intermediate','English','reference',true,false,'approved','Pair examples with G3 code review rather than copying without understanding.',now()),
('FRCDesign Learning Course','Self-paced FRC-specific Onshape, CAD, mechanism design and engineering curriculum.','FRCDesign.org','https://frcdesign.org/learning-course/','cad','beginner','English','course',true,false,'approved','Excellent structured CAD path; pair with G3 manufacturing review.',now()),
('Spectrum 3847 Student Training','Broad FRC curriculum covering onboarding, controls, CAD, build, strategy, media and awards.','Spectrum 3847','https://www.spectrum3847.org/resources/training/','cross_team','all','English','pathway',true,false,'approved','High-value team-created curriculum; modules vary in age, so instructors must check individual items.',now()),
('The Compass Alliance Pathways','Step-by-step FRC learning pathways and a broad resource repository across technical and operational topics.','The Compass Alliance','https://www.thecompassalliance.org/','cross_team','all','English','pathway',true,false,'approved','Use curated pathways; verify linked third-party resources before assigning.',now()),
('Autodesk Resources for FIRST','FRC-focused CAD/CAM onboarding, software access, field models and simulation resources.','Autodesk','https://www.autodesk.com/education/competitions/first','cad','all','English','pathway',true,false,'approved','Free access may require education eligibility and account verification.',now()),
('Phoenix 6 Documentation','Current official CTR Electronics setup, control, logging, swerve, simulation and troubleshooting documentation.','CTR Electronics','https://v6.docs.ctr-electronics.com/en/stable/','software','advanced','English','documentation',true,false,'approved','Vendor-authoritative; use only for hardware installed on the G3 robot.',now())
on conflict(url) do update set
  title=excluded.title,description=excluded.description,provider=excluded.provider,domain=excluded.domain,
  level=excluded.level,language=excluded.language,resource_type=excluded.resource_type,
  free_access=excluded.free_access,embed_allowed=excluded.embed_allowed,status=excluded.status,
  review_note=excluded.review_note,reviewed_at=excluded.reviewed_at,updated_at=now();

commit;
