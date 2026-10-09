-- One shared resource reservation for an existing build OR fundraising job.
begin;
create table if not exists public.workshop_resources(
 id uuid primary key, tool_id uuid not null unique references public.workshop_tools(id) on delete restrict,
 kind text not null check(kind in ('printer','machine','workstation')), active boolean not null default true,
 created_by uuid not null references public.team_members(id),created_at timestamptz not null default now()
);
create table if not exists public.workshop_resource_claims(
 id uuid primary key,resource_id uuid not null references public.workshop_resources(id),
 build_job_id uuid references public.robot_build_jobs(id),fundraising_job_id uuid references public.fundraising_jobs(id),
 actor_id uuid not null references public.team_members(id),note text not null,
 created_at timestamptz not null default now(),released_at timestamptz,release_note text,
 check(num_nonnulls(build_job_id,fundraising_job_id)=1)
);
create unique index if not exists workshop_resource_exclusive on public.workshop_resource_claims(resource_id) where released_at is null;
create unique index if not exists workshop_build_one_resource on public.workshop_resource_claims(build_job_id) where released_at is null;
create unique index if not exists workshop_fundraising_one_resource on public.workshop_resource_claims(fundraising_job_id) where released_at is null;
alter table public.workshop_resources enable row level security;
alter table public.workshop_resource_claims enable row level security;
revoke all on public.workshop_resources,public.workshop_resource_claims from public,anon,authenticated;
grant select on public.workshop_resources,public.workshop_resource_claims to authenticated;
drop policy if exists resource_read on public.workshop_resources;
create policy resource_read on public.workshop_resources for select to authenticated using(exists(select 1 from public.team_members where id=auth.uid() and active));
drop policy if exists resource_claim_read on public.workshop_resource_claims;
create policy resource_claim_read on public.workshop_resource_claims for select to authenticated using(
 exists(select 1 from public.team_members where id=auth.uid() and active) and
 (exists(select 1 from public.robot_build_jobs where id=build_job_id) or exists(select 1 from public.fundraising_jobs where id=fundraising_job_id)));
create or replace function public.can_operate_workshop_resource(p_resource uuid)returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from public.workshop_resources r join public.workshop_tools t on t.id=r.tool_id where r.id=p_resource and r.active and t.status='available' and t.amount=1
 and not exists(select 1 from public.tool_checkouts where tool_id=t.id and returned_at is null)
 and not exists(select 1 from public.tool_maintenance where tool_id=t.id and status<>'resolved')
 and (not t.requires_training or coalesce(public.is_admin(),false) or exists(select 1 from public.tool_certifications where tool_id=t.id and member_id=auth.uid())))
$$;
revoke all on function public.can_operate_workshop_resource(uuid) from public,anon,authenticated;
create or replace function public.workshop_resource_availability() returns table(id uuid,name text,kind text,active boolean,busy boolean)
language sql stable security definer set search_path=public,pg_temp as $$
 select r.id,t.name,r.kind,r.active and t.status='available',exists(select 1 from public.workshop_resource_claims c where c.resource_id=r.id and c.released_at is null) or exists(select 1 from public.tool_checkouts where tool_id=t.id and returned_at is null) or exists(select 1 from public.tool_maintenance where tool_id=t.id and status<>'resolved')
 from public.workshop_resources r join public.workshop_tools t on t.id=r.tool_id where exists(select 1 from public.team_members where id=auth.uid() and active) order by lower(t.name),r.id
$$;
create or replace function public.register_workshop_resource(p_tool uuid,p_kind text,p_request uuid) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.workshop_resources%rowtype;
begin
 if not exists(select 1 from public.team_members where id=auth.uid() and active) or not coalesce(public.has_permission('manage_inventory'),false) then raise exception 'Inventory management permission required to register equipment';end if;
 perform pg_advisory_xact_lock(6740,912);
 select * into r from public.workshop_resources where id=p_request;
 if r.id is not null then if r.created_by=auth.uid() and r.tool_id=p_tool and r.kind=p_kind then return r.id;end if;raise exception 'Request identity already used';end if;
 if p_request is null or not exists(select 1 from public.workshop_tools where id=p_tool and status='available' and amount=1) or p_kind is null or p_kind not in ('printer','machine','workstation') then raise exception 'Choose one individually registered inventory tool and its resource type';end if;
 if p_kind='printer' and exists(select 1 from public.fundraising_jobs f where f.status='printing' and not exists(select 1 from public.workshop_resource_claims c where c.fundraising_job_id=f.id and c.released_at is null)) then raise exception 'Finish recording existing unassigned prints before registering shared printers';end if;
 insert into public.workshop_resources(id,tool_id,kind,created_by)values(p_request,p_tool,p_kind,auth.uid());return p_request;
end$$;
create or replace function public.claim_workshop_resource(p_resource uuid,p_build uuid,p_fundraising uuid,p_note text,p_request uuid) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare j public.robot_build_jobs%rowtype;f public.fundraising_jobs%rowtype;r public.workshop_resources%rowtype;c public.workshop_resource_claims%rowtype;
begin
 if not exists(select 1 from public.team_members where id=auth.uid() and active) or num_nonnulls(p_build,p_fundraising)<>1 then raise exception 'Choose one existing job';end if;
 if p_build is not null then
  select * into j from public.robot_build_jobs where id=p_build for update;
  if j.id is null or not exists(select 1 from public.project_tasks t join public.team_projects p on p.id=t.project_id where t.id=j.task_id and not t.archived and t.status<>'done' and p.status not in ('completed','archived') and (t.assignee_id=auth.uid() or public.has_permission('assign_team_work',p.subteam))) then raise exception 'Assigned worker or build leader required for active work';end if;
 else
  select * into f from public.fundraising_jobs where id=p_fundraising for update;
  if f.id is null or not public.fundraising_allowed() then raise exception 'Fundraising management permission required';end if;
 end if;
 perform pg_advisory_xact_lock(6740,912);
 select * into c from public.workshop_resource_claims where id=p_request;
 if c.id is not null then if c.resource_id=p_resource and c.build_job_id is not distinct from p_build and c.fundraising_job_id is not distinct from p_fundraising and c.actor_id=auth.uid() and c.note=trim(p_note) then return c.id;end if;raise exception 'Request identity already used';end if;
 if p_request is null or length(trim(coalesce(p_note,''))) not between 3 and 1000 then raise exception 'Describe the operation using this equipment';end if;
 if f.id is not null and f.status<>'planned' then raise exception 'Choose equipment before starting the print';end if;
 select * into r from public.workshop_resources where id=p_resource;
 if r.id is null or not r.active or (p_fundraising is not null and r.kind<>'printer') then raise exception 'Choose available equipment of the correct type';end if;
 if not exists(select 1 from public.workshop_tools where id=r.tool_id and status='available' and amount=1) or exists(select 1 from public.tool_checkouts where tool_id=r.tool_id and returned_at is null) or exists(select 1 from public.tool_maintenance where tool_id=r.tool_id and status<>'resolved') then raise exception 'Equipment is checked out or unavailable for use';end if;
 if exists(select 1 from public.workshop_tools where id=r.tool_id and requires_training) and not coalesce(public.is_admin(),false) and not exists(select 1 from public.tool_certifications where tool_id=r.tool_id and member_id=auth.uid()) then raise exception 'Existing equipment training authorization required';end if;
 if exists(select 1 from public.workshop_resource_claims where released_at is null and (resource_id=p_resource or build_job_id=p_build or fundraising_job_id=p_fundraising)) then raise exception 'Equipment or job already reserved. Refresh availability before continuing';end if;
 insert into public.workshop_resource_claims(id,resource_id,build_job_id,fundraising_job_id,actor_id,note)values(p_request,p_resource,p_build,p_fundraising,auth.uid(),trim(p_note));
 return p_request;
end$$;
create or replace function public.release_workshop_resource(p_claim uuid,p_note text)returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare c public.workshop_resource_claims%rowtype;
begin
 perform pg_advisory_xact_lock(6740,912);
 select * into c from public.workshop_resource_claims where id=p_claim for update;
 if c.id is null or not exists(select 1 from public.team_members where id=auth.uid() and active) or not (
 (c.fundraising_job_id is not null and public.fundraising_allowed()) or
 exists(select 1 from public.robot_build_jobs j join public.project_tasks t on t.id=j.task_id join public.team_projects p on p.id=t.project_id where j.id=c.build_job_id and (t.assignee_id=auth.uid() or public.has_permission('assign_team_work',p.subteam)))) then raise exception 'Job operator permission required';end if;
 if c.released_at is not null then if c.release_note=trim(p_note) then return;end if;raise exception 'Reservation was already released with a different reason';end if;
 if length(trim(coalesce(p_note,''))) not between 3 and 1000 then raise exception 'Describe why equipment is available again';end if;
 if exists(select 1 from public.fundraising_jobs where id=c.fundraising_job_id and status='printing') then raise exception 'Record the print result and material usage before releasing its printer';end if;
 update public.workshop_resource_claims set released_at=now(),release_note=trim(p_note) where id=c.id;
end$$;
create or replace function public.guard_workshop_print_resource() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if new.status is not distinct from old.status then return new;end if;
 perform pg_advisory_xact_lock(6740,912);
 if new.status='printing' and exists(select 1 from public.workshop_resources where active and kind='printer') and not exists(
 select 1 from public.workshop_resource_claims c join public.workshop_resources r on r.id=c.resource_id where c.fundraising_job_id=new.id and c.released_at is null and r.active and r.kind='printer') then raise exception 'Reserve a registered printer for this job before starting';end if;
 if new.status='printing' and exists(select 1 from public.workshop_resource_claims where fundraising_job_id=new.id and released_at is null and not public.can_operate_workshop_resource(resource_id)) then raise exception 'Reserved printer is unavailable or your equipment authorization changed';end if;
 if new.status in ('succeeded','partial','failed','cancelled') then
  update public.workshop_resource_claims set released_at=now(),release_note='Print job '||new.status where fundraising_job_id=new.id and released_at is null;
 end if;
 return new;
end$$;
drop trigger if exists workshop_print_resource on public.fundraising_jobs;
create trigger workshop_print_resource before update of status on public.fundraising_jobs for each row execute function public.guard_workshop_print_resource();
revoke all on function public.guard_workshop_print_resource() from public,anon,authenticated;
revoke all on function public.workshop_resource_availability(),public.register_workshop_resource(uuid,text,uuid),public.claim_workshop_resource(uuid,uuid,uuid,text,uuid),public.release_workshop_resource(uuid,text) from public,anon;
grant execute on function public.workshop_resource_availability(),public.register_workshop_resource(uuid,text,uuid),public.claim_workshop_resource(uuid,uuid,uuid,text,uuid),public.release_workshop_resource(uuid,text) to authenticated;
create or replace function public.guard_claimed_tool_checkout()returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform pg_advisory_xact_lock(6740,912);
 if new.returned_at is null and exists(select 1 from public.workshop_resource_claims c join public.workshop_resources r on r.id=c.resource_id where r.tool_id=new.tool_id and c.released_at is null) then raise exception 'Equipment is reserved by a production job; release that reservation first';end if;
 return new;
end$$;
drop trigger if exists guard_claimed_tool_checkout on public.tool_checkouts;
create trigger guard_claimed_tool_checkout before insert or update of tool_id,returned_at on public.tool_checkouts for each row execute function public.guard_claimed_tool_checkout();
revoke all on function public.guard_claimed_tool_checkout() from public,anon,authenticated;
create or replace function public.guard_build_claimed_equipment()returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if new.action='operation' and exists(select 1 from public.workshop_resource_claims where build_job_id=new.job_id and released_at is null and not public.can_operate_workshop_resource(resource_id)) then raise exception 'Reserved equipment is unavailable or your equipment authorization changed';end if;
 return new;
end$$;
drop trigger if exists guard_build_claimed_equipment on public.robot_build_work_events;
create trigger guard_build_claimed_equipment before insert on public.robot_build_work_events for each row execute function public.guard_build_claimed_equipment();
revoke all on function public.guard_build_claimed_equipment() from public,anon,authenticated;
commit;
