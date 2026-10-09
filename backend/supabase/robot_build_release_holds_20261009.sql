begin;
create table if not exists public.robot_build_release_holds(
 task_id uuid primary key references public.project_tasks(id),submission_id uuid not null references public.project_review_submissions(id),
 active boolean not null default true,revision integer not null default 1,reason text not null,
 raised_by uuid not null references public.team_members(id),raised_at timestamptz not null default now(),
 resolved_by uuid references public.team_members(id),resolved_at timestamptz,resolution text
);
create table if not exists public.robot_build_hold_events(
 id uuid primary key,task_id uuid not null references public.project_tasks(id),actor_id uuid not null references public.team_members(id),
 action text not null,expected_revision integer not null,note text not null,created_at timestamptz not null default now()
);
alter table public.robot_build_release_holds enable row level security;
alter table public.robot_build_hold_events enable row level security;
revoke all on public.robot_build_release_holds,public.robot_build_hold_events from public,anon,authenticated;
grant select on public.robot_build_release_holds,public.robot_build_hold_events to authenticated;
drop policy if exists build_hold_read on public.robot_build_release_holds;
create policy build_hold_read on public.robot_build_release_holds for select to authenticated using(exists(select 1 from public.team_members where id=auth.uid() and active) and exists(select 1 from public.project_tasks where id=task_id));
drop policy if exists build_hold_event_read on public.robot_build_hold_events;
create policy build_hold_event_read on public.robot_build_hold_events for select to authenticated using(exists(select 1 from public.robot_build_release_holds where task_id=robot_build_hold_events.task_id));
create or replace function public.robot_build_task_held(p_task uuid)returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 with recursive ancestors(id)as(
  select p_task union select d.prerequisite_id from public.project_task_dependencies d join ancestors a on a.id=d.task_id
 )select exists(select 1 from public.robot_build_release_holds h join ancestors a on a.id=h.task_id where h.active);
$$;
revoke all on function public.robot_build_task_held(uuid) from public,anon,authenticated;
-- Approval and permission to use that approval are distinct. A replacement release
-- must still be reviewable while the old manufacturing work is on hold.
create or replace function public.robot_build_review_usable(p_task uuid)returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select not public.robot_build_task_held(p_task) and public.project_review_passed(p_task);
$$;
revoke all on function public.robot_build_review_usable(uuid) from public,anon,authenticated;
-- Preserve existing function identities, gates, consensus checks and grants.
-- Patch only the build consumers, never the shared approval engine itself.
do $$declare f record;definition text;
begin
 for f in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname like '%robot_build%'
 and p.proname not in ('robot_build_review_usable','record_robot_build_hold')
 and position('public.project_review_passed(' in p.prosrc)>0 loop
  definition:=pg_get_functiondef(f.oid);
  execute replace(definition,'public.project_review_passed(','public.robot_build_review_usable(');
 end loop;
end$$;

create or replace function public.record_robot_build_hold(p_task uuid,p_action text,p_expected integer,p_note text,p_request uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare t public.project_tasks%rowtype;g public.project_review_gates%rowtype;h public.robot_build_release_holds%rowtype;e public.robot_build_hold_events%rowtype;
begin
 perform pg_advisory_xact_lock(6740,911);
 select * into t from public.project_tasks where id=p_task;select * into g from public.project_review_gates where task_id=p_task;
 if t.id is null or not exists(select 1 from public.team_members where id=auth.uid() and active)
 or not exists(select 1 from public.team_projects where id=t.project_id and status not in ('archived','completed')) then raise exception 'Active project access required';end if;
 if p_action='hold' then
  if not exists(select 1 from public.team_projects where id=t.project_id and public.has_permission('assign_team_work',subteam)) then raise exception 'Project leader required to hold a release';end if;
 elsif p_action='resolve' then
  if not (g.reviewer_id=auth.uid() or exists(select 1 from public.team_members where id=auth.uid() and role='admin')) then raise exception 'Assigned reviewer or admin required to resolve the hold';end if;
 else raise exception 'Choose hold or resolve';end if;
 select * into e from public.robot_build_hold_events where id=p_request;
 if e.id is not null then
  if e.task_id=p_task and e.actor_id=auth.uid() and e.action=p_action and e.expected_revision=p_expected and e.note=trim(p_note) then return;end if;
  raise exception 'Request identity already used';end if;
 if p_request is null or length(trim(coalesce(p_note,''))) not between 5 and 2000 or not g.enabled or g.decision_type<>'released_for_manufacturing' or g.current_submission is null then raise exception 'Choose a manufacturing release and describe the concern or reviewed resolution';end if;
 select * into h from public.robot_build_release_holds where task_id=p_task for update;
 if coalesce(h.revision,0) is distinct from p_expected then raise exception 'Hold changed. Reload before saving';end if;
 if p_action='hold' then
  if h.active then raise exception 'This release is already on hold';end if;
  insert into public.robot_build_release_holds(task_id,submission_id,reason,raised_by)values(p_task,g.current_submission,trim(p_note),auth.uid())
  on conflict(task_id)do update set active=true,submission_id=g.current_submission,reason=excluded.reason,raised_by=excluded.raised_by,raised_at=now(),resolved_by=null,resolved_at=null,resolution=null,revision=robot_build_release_holds.revision+1;
 else
  if h.task_id is null or not h.active then raise exception 'This release has no active hold';end if;
  if h.raised_by=auth.uid() then raise exception 'A different reviewer must resolve this hold';end if;
  update public.robot_build_release_holds set active=false,resolved_by=auth.uid(),resolved_at=now(),resolution=trim(p_note),revision=revision+1 where task_id=p_task;
  if not public.project_review_passed(p_task) then raise exception 'The current release still needs valid approval before resolving this hold';end if;
 end if;
 insert into public.robot_build_hold_events(id,task_id,actor_id,action,expected_revision,note)values(p_request,p_task,auth.uid(),p_action,p_expected,trim(p_note));
end$$;
revoke all on function public.record_robot_build_hold(uuid,text,integer,text,uuid) from public,anon;
grant execute on function public.record_robot_build_hold(uuid,text,integer,text,uuid) to authenticated;
commit;
