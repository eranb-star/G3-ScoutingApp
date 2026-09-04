-- G3 6740: multi-team authorization, scoped leaders and configurable role permissions.
-- Run in Supabase SQL Editor. Safe to run more than once.
begin;

alter table public.team_members add column if not exists subteams text[] not null default '{}';
alter table public.team_members add column if not exists leader_subteams text[] not null default '{}';
update public.team_members set subteams=array[subteam] where subteam is not null and trim(subteam)<>'' and cardinality(subteams)=0;
alter table public.team_members drop constraint if exists team_members_role_check;
alter table public.team_members add constraint team_members_role_check check(role in ('member','team_leader','mentor','admin'));
create index if not exists team_members_subteams_gin_idx on public.team_members using gin(subteams);
create index if not exists team_members_leader_subteams_gin_idx on public.team_members using gin(leader_subteams);

create table if not exists public.app_permissions(
  permission_key text primary key,
  permission_group text not null,
  label text not null,
  label_he text not null,
  description text not null,
  protected boolean not null default false,
  sort_order integer not null default 100
);
create table if not exists public.role_permissions(
  role text not null check(role in ('member','team_leader','mentor','admin')),
  permission_key text not null references public.app_permissions(permission_key) on delete cascade,
  allowed boolean not null default false,
  updated_by uuid references public.team_members(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key(role,permission_key)
);

insert into public.app_permissions(permission_key,permission_group,label,label_he,description,protected,sort_order) values
('view_team_data','Core','View team information','צפייה במידע הקבוצה','Access normal team schedules, projects, updates and directories.',false,10),
('manage_team_projects','Work','Manage department projects','ניהול פרויקטים מחלקתיים','Create and manage projects and tasks within authorized teams.',false,20),
('assign_team_work','Work','Assign team work','הקצאת עבודה לצוות','Assign tasks and responsibilities within authorized teams.',false,30),
('manage_robot_reliability','Robot','Manage robot reliability','ניהול אמינות הרובוט','Manage issues, maintenance, tests and readiness.',false,40),
('manage_training','Skills','Build and assign courses','יצירה והקצאת קורסים','Create courses, modules and team enrollments.',false,50),
('validate_training','Skills','Validate training evidence','אימות ראיות הכשרה','Approve evidence and qualifications.',false,60),
('manage_team_calendar','Coordination','Manage team calendar','ניהול לוח הקבוצה','Create and update calendar events for authorized teams.',false,70),
('create_announcements','Communication','Publish announcements','פרסום הודעות','Publish official announcements to authorized audiences.',false,80),
('manage_inventory','Operations','Manage tools and inventory','ניהול כלים ומלאי','Manage stock, tools and purchasing workflow.',false,90),
('operate_competition','Competition','Manage competition operations','ניהול תפעול תחרות','Manage assignments, pit queue and competition briefings.',false,100),
('view_team_reports','Reporting','View team reports','צפייה בדוחות צוות','View attendance and contribution reporting for authorized teams.',false,110),
('correct_attendance','Attendance','Correct attendance','תיקון נוכחות','Create administrative attendance corrections.',true,120),
('manage_members','Administration','Manage member accounts','ניהול חשבונות חברים','Create, deactivate, reset and assign members.',true,130),
('manage_permissions','Administration','Configure roles and permissions','הגדרת תפקידים והרשאות','Change security permissions for G3 roles.',true,140),
('view_security_audit','Administration','View security and audit','צפייה באבטחה וביקורת','Access security oversight, exports and audit records.',true,150)
on conflict(permission_key) do update set permission_group=excluded.permission_group,label=excluded.label,label_he=excluded.label_he,description=excluded.description,protected=excluded.protected,sort_order=excluded.sort_order;

insert into public.role_permissions(role,permission_key,allowed)
select roles.role,p.permission_key,
 case
  when roles.role='admin' then true
  when roles.role='mentor' then p.permission_key in ('view_team_data','manage_team_projects','assign_team_work','manage_robot_reliability','manage_training','validate_training','manage_team_calendar','create_announcements','manage_inventory','operate_competition','view_team_reports')
  when roles.role='team_leader' then p.permission_key in ('view_team_data','manage_team_projects','assign_team_work','manage_robot_reliability','manage_training','manage_team_calendar','create_announcements','manage_inventory','operate_competition','view_team_reports')
  else p.permission_key in ('view_team_data','operate_competition')
 end
from (values('member'),('team_leader'),('mentor'),('admin')) roles(role)
cross join public.app_permissions p
on conflict(role,permission_key) do nothing;

create or replace function public.normalize_team(target_team text)
returns text language sql immutable as $$
 select case
  when lower(trim(coalesce(target_team,''))) in ('mechanical','mech') then 'mechanical'
  when lower(trim(coalesce(target_team,''))) in ('cad','cad & design','design') then 'cad'
  when lower(trim(coalesce(target_team,''))) in ('electrical','electronics','elec') then 'electrical'
  when lower(trim(coalesce(target_team,''))) in ('software','code','programming') then 'software'
  when lower(trim(coalesce(target_team,''))) in ('strategy','strategy & scouting','scouting') then 'strategy'
  when lower(trim(coalesce(target_team,''))) in ('field','field build','field build & infrastructure') then 'field'
  when lower(trim(coalesce(target_team,''))) in ('pit','drive & pit','drive team') then 'pit'
  when lower(trim(coalesce(target_team,''))) in ('business','business & outreach','outreach') then 'business'
  when lower(trim(coalesce(target_team,''))) in ('publicity','publicity & awards','judging','awards') then 'publicity'
  else lower(trim(coalesce(target_team,''))) end;
$$;

create or replace function public.current_member_has_team(target_team text)
returns boolean language sql stable security definer set search_path=public as $$
 select coalesce(exists(select 1 from public.team_members m where m.id=auth.uid() and m.active and (
   m.role in ('admin','mentor') or
   exists(select 1 from unnest(array_append(coalesce(m.subteams,'{}'::text[]),coalesce(m.subteam,''))) x where public.normalize_team(x)=public.normalize_team(target_team))
 )),false);
$$;

create or replace function public.current_member_leads_team(target_team text)
returns boolean language sql stable security definer set search_path=public as $$
 select coalesce(exists(select 1 from public.team_members m where m.id=auth.uid() and m.active and (
   m.role in ('admin','mentor') or
   (m.role='team_leader' and exists(select 1 from unnest(coalesce(m.leader_subteams,'{}'::text[])) x where public.normalize_team(x)=public.normalize_team(target_team)))
 )),false);
$$;

create or replace function public.has_permission(requested_permission text, target_team text default null)
returns boolean language sql stable security definer set search_path=public as $$
 select coalesce(exists(select 1 from public.team_members m join public.role_permissions rp on rp.role=m.role and rp.permission_key=requested_permission and rp.allowed
 where m.id=auth.uid() and m.active and (m.role='admin' or m.role='mentor' or (m.role='team_leader' and (requested_permission not in ('manage_team_projects','assign_team_work','manage_robot_reliability','manage_training','manage_team_calendar','create_announcements','manage_inventory','view_team_reports') or target_team is not null and public.current_member_leads_team(target_team))) or (m.role='member' and target_team is null))),false);
$$;
grant execute on function public.current_member_has_team(text) to authenticated;
grant execute on function public.current_member_leads_team(text) to authenticated;
grant execute on function public.has_permission(text,text) to authenticated;
grant execute on function public.normalize_team(text) to authenticated;

insert into public.team_channels(slug,name,name_he,description,kind,subteam,sort_order) values
 ('mechanical','Mechanical','מכניקה','Fabrication, mechanisms and build reviews.','subteam','Mechanical',20),
 ('cad-design','CAD & Design','שרטוט ותכנון','CAD, drawings, geometry and design reviews.','subteam','CAD & Design',25),
 ('electrical','Electrical','אלקטרוניקה','Wiring, CAN, power, batteries and inspection.','subteam','Electrical',30),
 ('software','Software','תוכנה','Robot code, controls, vision, releases and testing.','subteam','Software',40),
 ('strategy-scouting','Strategy & Scouting','אסטרטגיה וסקאוטינג','Game analysis, scouting and match planning.','subteam','Strategy & Scouting',50),
 ('field-build','Field Build & Infrastructure','בניית מגרש ותשתיות','Field elements, workshop infrastructure and pit construction.','subteam','Field Build & Infrastructure',55),
 ('drive-pit','Drive & Pit','נהיגה ופיט','Drive practice, robot readiness, repairs and competition turnaround.','subteam','Drive & Pit',60),
 ('business-outreach','Business & Outreach','קהילה ועסקים','Sponsors, fundraising and community outreach.','subteam','Business & Outreach',70),
 ('publicity-awards','Publicity & Awards','ייצוג ופרסים','Judging, team story, awards and public representation.','subteam','Publicity & Awards',75)
on conflict(slug) do update set name=excluded.name,name_he=excluded.name_he,description=excluded.description,kind=excluded.kind,subteam=excluded.subteam,sort_order=excluded.sort_order,archived=false;

alter table public.app_permissions enable row level security;
alter table public.role_permissions enable row level security;
drop policy if exists "members view permission catalogue" on public.app_permissions;
create policy "members view permission catalogue" on public.app_permissions for select to authenticated using(public.current_team_role() is not null);
drop policy if exists "members view role permissions" on public.role_permissions;
create policy "members view role permissions" on public.role_permissions for select to authenticated using(public.current_team_role() is not null);
drop policy if exists "admins configure role permissions" on public.role_permissions;
create policy "admins configure role permissions" on public.role_permissions for all to authenticated using(public.has_permission('manage_permissions')) with check(public.has_permission('manage_permissions'));

create or replace function public.can_access_team_channel(target public.team_channels)
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.team_members m where m.id=auth.uid() and m.active and (
  target.kind in ('team','project','event') or
  (target.kind='subteam' and (public.current_member_has_team(target.subteam) or public.current_member_leads_team(target.subteam))) or
  (target.kind='leadership' and m.role in ('admin','mentor','team_leader'))
 ));
$$;

drop policy if exists "members read applicable announcements" on public.announcements;
create policy "members read applicable announcements" on public.announcements for select to authenticated using(
 (not archived or public.is_admin()) and (expires_at is null or expires_at>now() or public.is_admin()) and (
 audience='all' or audience='members' and public.current_team_role() in ('member','team_leader') or
 audience='mentors' and public.current_team_role() in ('mentor','admin') or
 audience='admins' and public.current_team_role()='admin' or
 audience='subteam' and public.current_member_has_team(audience_subteam)));
drop policy if exists "admins create announcements" on public.announcements;
drop policy if exists "authorized publish announcements" on public.announcements;
create policy "authorized publish announcements" on public.announcements for insert to authenticated with check(created_by=auth.uid() and public.has_permission('create_announcements',case when audience='subteam' then audience_subteam else null end));
drop policy if exists "admins update announcements" on public.announcements;
drop policy if exists "authorized update announcements" on public.announcements;
create policy "authorized update announcements" on public.announcements for update to authenticated using(public.has_permission('create_announcements',case when audience='subteam' then audience_subteam else null end)) with check(public.has_permission('create_announcements',case when audience='subteam' then audience_subteam else null end));

drop policy if exists "members view targeted actions" on public.team_actions;
create policy "members view targeted actions" on public.team_actions for select to authenticated using(not cancelled and (target_type='all' or target_type='member' and target_value=auth.uid()::text or target_type='subteam' and public.current_member_has_team(target_value)));

drop policy if exists "members view team_calendar_events" on public.team_calendar_events;
drop policy if exists "members view calendar events" on public.team_calendar_events;
create policy "members view calendar events" on public.team_calendar_events for select to authenticated using(not cancelled and (target_type='all' or target_type='member' and target_value=auth.uid()::text or target_type='subteam' and public.current_member_has_team(target_value)));
drop policy if exists "admins create calendar events" on public.team_calendar_events;
drop policy if exists "authorized create calendar events" on public.team_calendar_events;
create policy "authorized create calendar events" on public.team_calendar_events for insert to authenticated with check(public.has_permission('manage_team_calendar',case when target_type='subteam' then target_value else null end));
drop policy if exists "admins update calendar events" on public.team_calendar_events;
drop policy if exists "authorized update calendar events" on public.team_calendar_events;
create policy "authorized update calendar events" on public.team_calendar_events for update to authenticated using(public.has_permission('manage_team_calendar',case when target_type='subteam' then target_value else null end)) with check(public.has_permission('manage_team_calendar',case when target_type='subteam' then target_value else null end));

drop policy if exists "members create projects" on public.team_projects;
drop policy if exists "authorized create projects" on public.team_projects;
create policy "authorized create projects" on public.team_projects for insert to authenticated with check(created_by=auth.uid() and public.has_permission('manage_team_projects',subteam));
drop policy if exists "owners manage projects" on public.team_projects;
drop policy if exists "authorized manage projects" on public.team_projects;
create policy "authorized manage projects" on public.team_projects for update to authenticated using(owner_id=auth.uid() or public.has_permission('manage_team_projects',subteam)) with check(owner_id=auth.uid() or public.has_permission('manage_team_projects',subteam));

drop policy if exists "leaders create courses" on public.training_courses;
drop policy if exists "authorized create courses" on public.training_courses;
create policy "authorized create courses" on public.training_courses for insert to authenticated with check(public.has_permission('manage_training',target_subteam));
drop policy if exists "leaders update courses" on public.training_courses;
drop policy if exists "authorized update courses" on public.training_courses;
create policy "authorized update courses" on public.training_courses for update to authenticated using(public.has_permission('manage_training',target_subteam)) with check(public.has_permission('manage_training',target_subteam));
drop policy if exists "admins create modules" on public.training_modules;
drop policy if exists "admins update modules" on public.training_modules;
drop policy if exists "leaders create modules" on public.training_modules;
drop policy if exists "leaders update modules" on public.training_modules;
drop policy if exists "authorized create modules" on public.training_modules;
drop policy if exists "authorized update modules" on public.training_modules;
create policy "authorized create modules" on public.training_modules for insert to authenticated with check(exists(select 1 from public.training_courses c where c.id=course_id and public.has_permission('manage_training',c.target_subteam)));
create policy "authorized update modules" on public.training_modules for update to authenticated using(exists(select 1 from public.training_courses c where c.id=course_id and public.has_permission('manage_training',c.target_subteam))) with check(exists(select 1 from public.training_courses c where c.id=course_id and public.has_permission('manage_training',c.target_subteam)));
drop policy if exists "admins create enrollments" on public.training_enrollments;
drop policy if exists "admins update enrollments" on public.training_enrollments;
drop policy if exists "authorized create enrollments" on public.training_enrollments;
drop policy if exists "authorized update enrollments" on public.training_enrollments;
create policy "authorized create enrollments" on public.training_enrollments for insert to authenticated with check(exists(select 1 from public.training_courses c where c.id=course_id and public.has_permission('manage_training',c.target_subteam)));
create policy "authorized update enrollments" on public.training_enrollments for update to authenticated using(member_id=auth.uid() or exists(select 1 from public.training_courses c where c.id=course_id and public.has_permission('manage_training',c.target_subteam))) with check(member_id=auth.uid() or exists(select 1 from public.training_courses c where c.id=course_id and public.has_permission('manage_training',c.target_subteam)));
drop policy if exists "admins review evidence" on public.training_evidence;
drop policy if exists "authorized review evidence" on public.training_evidence;
create policy "authorized review evidence" on public.training_evidence for update to authenticated using(public.has_permission('validate_training')) with check(public.has_permission('validate_training'));

commit;
