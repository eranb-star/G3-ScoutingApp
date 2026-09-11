-- Additive operations batch. No notifications, scheduled jobs or paid services.
begin;
alter table public.robot_components add column if not exists service_owner_id uuid references public.team_members(id) on delete set null;
alter table public.robot_components add column if not exists first_service_due date;
alter table public.frc_parts_inventory add column if not exists target_quantity numeric check(target_quantity >= 0);
alter table public.frc_parts_inventory drop constraint if exists replenishment_target_minimum;
alter table public.frc_parts_inventory add constraint replenishment_target_minimum check(target_quantity is null or target_quantity>=minimum_quantity);

-- Recording service and advancing its baseline must succeed together.
create or replace function public.record_component_service(p_component uuid,p_notes text,p_location text)
returns void language plpgsql security invoker set search_path=public as $$
declare affected integer;
begin
 update public.robot_components set last_serviced_at=now(),updated_at=now(),
 status=case when status='service_due' then 'installed' else status end where id=p_component;
 get diagnostics affected=row_count;
 if affected<>1 then raise exception 'Component unavailable or not permitted'; end if;
 insert into public.robot_component_events(component_id,event_type,notes,robot_location,performed_by)
 values(p_component,'serviced',nullif(trim(p_notes),''),nullif(trim(p_location),''),auth.uid());
end$$;
revoke all on function public.record_component_service(uuid,text,text) from public,anon;
grant execute on function public.record_component_service(uuid,text,text) to authenticated;

-- Only aggregate quantities are shared; purchase identities and finances stay private.
alter table public.readiness_purchase_counts add column if not exists quantity numeric not null default 0;
create or replace function public.refresh_readiness_purchase_counts() returns trigger language plpgsql security definer set search_path=public as $$
declare target uuid; targets uuid[];
begin
 if tg_op='INSERT' then targets=array[new.part_id];elsif tg_op='DELETE' then targets=array[old.part_id];else targets=array[old.part_id,new.part_id];end if;
 for target in select distinct x from unnest(targets) x where x is not null order by x loop
   perform 1 from public.frc_parts_inventory where id=target for update;
   delete from public.readiness_purchase_counts where part_id=target;
   insert into public.readiness_purchase_counts(part_id,status,requests,quantity)
   select part_id,status,count(*),coalesce(sum(quantity),0) from public.frc_purchase_requests
   where part_id=target and status in ('requested','approved','ordered') group by part_id,status;
 end loop;return null;
end$$;
delete from public.readiness_purchase_counts;
insert into public.readiness_purchase_counts(part_id,status,requests,quantity)
select part_id,status,count(*),coalesce(sum(quantity),0) from public.frc_purchase_requests
where part_id is not null and status in ('requested','approved','ordered') group by part_id,status;

create table if not exists public.event_robot_requirements(
 id uuid primary key default gen_random_uuid(),
 calendar_event_id uuid not null references public.team_calendar_events(id) on delete cascade,
 plan_id uuid not null references public.robot_test_plans(id) on delete restrict,
 owner_id uuid not null references public.team_members(id) on delete restrict,
 due_at timestamptz not null,created_by uuid not null default auth.uid(),created_at timestamptz not null default now(),
 unique(calendar_event_id,plan_id)
);
alter table public.event_robot_requirements enable row level security;
drop policy if exists event_robot_read on public.event_robot_requirements;
create policy event_robot_read on public.event_robot_requirements for select to authenticated using(
 exists(select 1 from public.team_calendar_events c where c.id=calendar_event_id and not c.cancelled)
 and exists(select 1 from public.robot_test_plans p where p.id=plan_id));
drop policy if exists event_robot_manage on public.event_robot_requirements;
create policy event_robot_manage on public.event_robot_requirements for all to authenticated using(
 exists(select 1 from public.team_calendar_events c where c.id=calendar_event_id and not c.cancelled
 and public.has_permission('manage_team_calendar',case when c.target_type='subteam' then c.target_value else null end)))
 with check(created_by=auth.uid() and exists(select 1 from public.team_calendar_events c where c.id=calendar_event_id and not c.cancelled
 and due_at<=c.starts_at and public.has_permission('manage_team_calendar',case when c.target_type='subteam' then c.target_value else null end))
 and exists(select 1 from public.robot_test_plans p where p.id=plan_id and p.active)
 and exists(select 1 from public.team_members m where m.id=owner_id and m.active));
grant select,insert,delete on public.event_robot_requirements to authenticated;
revoke update on public.event_robot_requirements from authenticated;

alter table public.robot_test_runs add column if not exists event_requirement_id uuid references public.event_robot_requirements(id) on delete restrict;
alter table public.robot_test_runs add column if not exists event_plan_fingerprint text;
create index if not exists robot_runs_event_requirement on public.robot_test_runs(event_requirement_id,performed_at desc);
-- Existing test-run policies remain; event runs additionally require the assigned tester or a scoped manager.
create or replace function public.guard_event_robot_run() returns trigger language plpgsql security invoker set search_path=public as $$
begin
 if tg_op='UPDATE' and old.event_requirement_id is not null then raise exception 'Event test results are append-only; record a new run';end if;
 if new.event_requirement_id is not null then
 if not exists(select 1 from public.event_robot_requirements r join public.robot_test_plans p on p.id=r.plan_id
 where r.id=new.event_requirement_id and r.plan_id=new.plan_id and p.active
 and (r.owner_id=auth.uid() or public.has_permission('manage_robot_reliability',p.subsystem)))
 then raise exception 'Event requirement unavailable or tester not permitted';end if;
 select md5(jsonb_build_array(p.procedure,p.success_criteria,p.safety_notes)::text) into new.event_plan_fingerprint
 from public.robot_test_plans p where p.id=new.plan_id;
 new.performed_by=auth.uid();new.performed_at=now();
 end if;return new;
end$$;
drop trigger if exists guard_event_robot_run on public.robot_test_runs;
create trigger guard_event_robot_run before insert or update on public.robot_test_runs for each row execute function public.guard_event_robot_run();

create or replace function public.event_robot_check_context(p_event uuid default null) returns jsonb
language sql stable security invoker set search_path=public as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'event_id',r.calendar_event_id,'event_title',c.title,
 'plan_id',r.plan_id,'title',p.title,'active',p.active,'subsystem',p.subsystem,'owner_id',r.owner_id,'owner',m.display_name,
 'due_at',r.due_at,'result',run.result,'performed_at',run.performed_at) order by r.due_at),'[]'::jsonb)
 from public.event_robot_requirements r join public.team_calendar_events c on c.id=r.calendar_event_id
 join public.robot_test_plans p on p.id=r.plan_id left join public.team_members m on m.id=r.owner_id
 left join lateral(select case when t.event_plan_fingerprint=md5(jsonb_build_array(p.procedure,p.success_criteria,p.safety_notes)::text)
 then t.result else 'stale' end as result,t.performed_at from public.robot_test_runs t where t.event_requirement_id=r.id
 order by t.performed_at desc,t.id desc limit 1) run on true
 where (p_event is not null and r.calendar_event_id=p_event) or (p_event is null and c.ends_at>=now()
 and c.starts_at<=now()+interval '30 days' and (r.owner_id=auth.uid() or public.has_permission('view_team_risks')));
$$;
revoke all on function public.event_robot_check_context(uuid) from public,anon;
grant execute on function public.event_robot_check_context(uuid) to authenticated;
commit;
