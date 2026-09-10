-- Phase 1: explicit Home event context and two source-derived risk conditions.
-- No tasks, announcements, pushes or paid services are created by this migration.
begin;
alter table public.team_calendar_events add column if not exists home_featured boolean not null default false;
alter table public.team_calendar_events add column if not exists home_countdown_days integer not null default 30 check(home_countdown_days between 0 and 365);
alter table public.team_calendar_events add column if not exists home_priority integer not null default 0 check(home_priority between 0 and 10);
alter table public.team_calendar_events add column if not exists competition_event_id uuid references public.events(id) on delete set null;
create index if not exists calendar_home_featured_idx on public.team_calendar_events(starts_at) where home_featured and not cancelled;
create or replace function public.calendar_competition_dates() returns trigger language plpgsql security invoker set search_path=public as $$
declare e public.events%rowtype;
begin
 if new.competition_event_id is not null then
   select * into e from public.events where id=new.competition_event_id;
   if not found or e.start_date is null then raise exception 'Choose an accessible competition with a confirmed start date';end if;
   if coalesce(e.end_date,e.start_date)<e.start_date then raise exception 'Competition end precedes start';end if;
   new.event_type='competition';new.all_day=true;
   new.starts_at=e.start_date::timestamp at time zone 'Asia/Jerusalem';
   new.ends_at=(coalesce(e.end_date,e.start_date)::timestamp+interval '1 day'-interval '1 second') at time zone 'Asia/Jerusalem';
 end if;
 return new;
end$$;
drop trigger if exists calendar_linked_competition_dates on public.team_calendar_events;
create trigger calendar_linked_competition_dates before insert or update on public.team_calendar_events for each row execute function public.calendar_competition_dates();
create or replace function public.propagate_competition_dates() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.start_date is not null then
 update public.team_calendar_events set starts_at=new.start_date::timestamp at time zone 'Asia/Jerusalem',
 ends_at=(coalesce(new.end_date,new.start_date)::timestamp+interval '1 day'-interval '1 second') at time zone 'Asia/Jerusalem'
 where competition_event_id=new.id;
 end if;return new;
end$$;
drop trigger if exists competition_dates_to_calendar on public.events;
create trigger competition_dates_to_calendar after update of start_date,end_date on public.events for each row execute function public.propagate_competition_dates();

alter table public.frc_parts_inventory add column if not exists stock_alert_enabled boolean not null default false;
-- Opt in deliberately through the inventory editor; historical zero defaults
-- must not create a wall of alerts on first deployment.

insert into public.app_permissions(permission_key,permission_group,label,label_he,description,protected,sort_order)
values('view_team_risks','Operations','View team operational risks','צפייה בסיכונים תפעוליים','View source-permitted critical robot issues and monitored stock shortages across the team.',false,92)
on conflict(permission_key) do nothing;
insert into public.role_permissions(role,permission_key,allowed) values
('member','view_team_risks',false),('team_leader','view_team_risks',true),('mentor','view_team_risks',true),('admin','view_team_risks',true)
on conflict(role,permission_key) do nothing;

create table if not exists public.system_signals (
 id uuid primary key default gen_random_uuid(),
 signal_type text not null check(signal_type in ('CRITICAL_ROBOT_ISSUE','STOCK_BELOW_MINIMUM')),
 source_id uuid not null,
 severity text not null check(severity in ('warning','high','critical')),
 title text not null,summary text not null,
 status text not null check(status in ('active','resolved')),
 assigned_user_id uuid references public.team_members(id) on delete set null,
 href text not null,
 opened_at timestamptz not null default now(),updated_at timestamptz not null default now(),resolved_at timestamptz,
 unique(signal_type,source_id)
);
create index if not exists system_signals_active_idx on public.system_signals(severity,updated_at) where status='active';
create table if not exists public.system_signal_history (
 id bigint generated always as identity primary key,
 signal_id uuid not null references public.system_signals(id),
 status text not null,severity text not null,changed_at timestamptz not null default now(),
 changed_by uuid default auth.uid()
);
alter table public.system_signals enable row level security;
alter table public.system_signal_history enable row level security;
drop policy if exists "source permitted risks" on public.system_signals;
create policy "source permitted risks" on public.system_signals for select to authenticated using(
 exists(select 1 from public.team_members m where m.id=auth.uid() and m.active)
 and (public.has_permission('view_team_risks') or assigned_user_id=auth.uid())
 and ((signal_type='CRITICAL_ROBOT_ISSUE' and exists(select 1 from public.robot_issues r where r.id=source_id))
 or (signal_type='STOCK_BELOW_MINIMUM' and exists(select 1 from public.frc_parts_inventory p where p.id=source_id)))
);
drop policy if exists "visible signal history" on public.system_signal_history;
create policy "visible signal history" on public.system_signal_history for select to authenticated using(exists(select 1 from public.system_signals s where s.id=signal_id));
grant select on public.system_signals,public.system_signal_history to authenticated;
revoke insert,update,delete on public.system_signals,public.system_signal_history from authenticated,anon;

create or replace function public.record_signal_transition() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if tg_op='INSERT' then
   insert into public.system_signal_history(signal_id,status,severity) values(new.id,new.status,new.severity);
 elsif new.status is distinct from old.status or new.severity is distinct from old.severity then
   insert into public.system_signal_history(signal_id,status,severity) values(new.id,new.status,new.severity);
 end if;
 return new;
end$$;
drop trigger if exists signal_transition_history on public.system_signals;
create trigger signal_transition_history after insert or update on public.system_signals for each row execute function public.record_signal_transition();

create or replace function public.reconcile_readiness_signal(kind text,entity uuid) returns void language plpgsql security definer set search_path=public as $$
declare active_condition boolean:=false; label text; details text; level text; owner uuid; destination text;
begin
 if kind='CRITICAL_ROBOT_ISSUE' then
   select not r.archived and r.severity='critical' and r.status<>'resolved',r.title,
     r.subsystem||' · '||replace(r.status,'_',' '),'critical',r.owner_id,'/robot-issues?issue='||r.id
   into active_condition,label,details,level,owner,destination from public.robot_issues r where r.id=entity;
 elsif kind='STOCK_BELOW_MINIMUM' then
   select not p.archived and p.stock_alert_enabled and p.quantity<=p.minimum_quantity,p.name,
     p.quantity||' '||p.unit||' available · reorder at '||p.minimum_quantity,
     case when p.quantity<=0 then 'high' else 'warning' end,null::uuid,'/tools?part='||p.id
   into active_condition,label,details,level,owner,destination from public.frc_parts_inventory p where p.id=entity;
 else raise exception 'Unsupported readiness rule'; end if;
 if coalesce(active_condition,false) then
   insert into public.system_signals(signal_type,source_id,severity,title,summary,status,assigned_user_id,href)
   values(kind,entity,level,label,details,'active',owner,destination)
   on conflict(signal_type,source_id) do update set severity=excluded.severity,title=excluded.title,
     summary=excluded.summary,assigned_user_id=excluded.assigned_user_id,href=excluded.href,
     opened_at=case when system_signals.status='resolved' then now() else system_signals.opened_at end,
     status='active',resolved_at=null,updated_at=now();
 else
   update public.system_signals set status='resolved',resolved_at=now(),updated_at=now()
   where signal_type=kind and source_id=entity and status='active';
 end if;
end$$;
revoke all on function public.reconcile_readiness_signal(text,uuid) from public,anon,authenticated;
create or replace function public.source_readiness_changed() returns trigger language plpgsql security definer set search_path=public as $$
begin
 perform public.reconcile_readiness_signal(case when tg_table_name='robot_issues' then 'CRITICAL_ROBOT_ISSUE' else 'STOCK_BELOW_MINIMUM' end,case when tg_op='DELETE' then old.id else new.id end);
 return null;
end$$;
drop trigger if exists robot_readiness_signal on public.robot_issues;
create trigger robot_readiness_signal after insert or update or delete on public.robot_issues for each row execute function public.source_readiness_changed();
drop trigger if exists stock_readiness_signal on public.frc_parts_inventory;
create trigger stock_readiness_signal after insert or update or delete on public.frc_parts_inventory for each row execute function public.source_readiness_changed();

-- Invoker functions retain source RLS. They accept no user ID.
create table if not exists public.readiness_purchase_counts(
 part_id uuid not null references public.frc_parts_inventory(id) on delete cascade,status text not null,
 requests integer not null,primary key(part_id,status)
);
alter table public.readiness_purchase_counts enable row level security;
drop policy if exists "source permitted purchase counts" on public.readiness_purchase_counts;
create policy "source permitted purchase counts" on public.readiness_purchase_counts for select to authenticated using(
 (public.has_permission('view_team_risks') or public.has_permission('submit_purchase_requests'))
 and exists(select 1 from public.frc_parts_inventory p where p.id=part_id and not p.archived)
);
grant select on public.readiness_purchase_counts to authenticated;
revoke insert,update,delete on public.readiness_purchase_counts from authenticated,anon;
create or replace function public.refresh_readiness_purchase_counts() returns trigger language plpgsql security definer set search_path=public as $$
declare target uuid; targets uuid[];
begin
 if tg_op='INSERT' then targets=array[new.part_id];elsif tg_op='DELETE' then targets=array[old.part_id];else targets=array[old.part_id,new.part_id];end if;
 for target in select distinct unnest(targets) loop
 if target is not null then
   -- Serialize changes to the same part before calculating its current counts.
   perform 1 from public.frc_parts_inventory where id=target for update;
   delete from public.readiness_purchase_counts where part_id=target;
   insert into public.readiness_purchase_counts(part_id,status,requests)
   select part_id,status,count(*) from public.frc_purchase_requests where part_id=target and status in ('requested','approved','ordered') group by part_id,status;
 end if;end loop;return null;
end$$;
drop trigger if exists purchase_readiness_counts on public.frc_purchase_requests;
create trigger purchase_readiness_counts after insert or update or delete on public.frc_purchase_requests for each row execute function public.refresh_readiness_purchase_counts();
insert into public.readiness_purchase_counts(part_id,status,requests)
select part_id,status,count(*) from public.frc_purchase_requests where part_id is not null and status in ('requested','approved','ordered') group by part_id,status
on conflict(part_id,status) do update set requests=excluded.requests;
create or replace function public.readiness_purchase_context() returns jsonb language sql stable security invoker set search_path=public as $$
 select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from (
 select p.part_id,p.status,p.requests from public.readiness_purchase_counts p
 join public.frc_parts_inventory i on i.id=p.part_id
 where not i.archived and i.stock_alert_enabled and i.quantity<=i.minimum_quantity) x;
$$;
revoke all on function public.readiness_purchase_context() from public,anon;
grant execute on function public.readiness_purchase_context() to authenticated;
create or replace function public.home_readiness_context() returns jsonb language sql stable security invoker set search_path=public as $$
 with contexts as (
 select c.id,c.title,c.event_type,c.home_priority,c.competition_event_id,
 case when c.competition_event_id is not null then e.start_date else (c.starts_at at time zone 'Asia/Jerusalem')::date end as start_day,
 case when c.competition_event_id is not null then coalesce(e.end_date,e.start_date) else (c.ends_at at time zone 'Asia/Jerusalem')::date end as end_day,
 c.home_countdown_days
 from public.team_calendar_events c left join public.events e on e.id=c.competition_event_id
 where c.home_featured and not c.cancelled and exists(select 1 from public.team_members m where m.id=auth.uid() and m.active)
 and (c.competition_event_id is null or (e.active and e.start_date is not null))
 ), eligible as (
 select *,start_day-(now() at time zone 'Asia/Jerusalem')::date as days_until from contexts
 where end_day>=(now() at time zone 'Asia/Jerusalem')::date
 and start_day<=(now() at time zone 'Asia/Jerusalem')::date+home_countdown_days
 )
 select jsonb_build_object('as_of',now(),'purchases',public.readiness_purchase_context(),'event',(select to_jsonb(x) from (
 select * from eligible order by
 case when days_until<=0 and event_type='competition' then 0 when days_until<=0 then 1 else 2 end,
 home_priority desc,start_day,id limit 1) x),
 'risks',coalesce((select jsonb_agg(to_jsonb(s) order by case severity when 'critical' then 0 when 'high' then 1 else 2 end,opened_at) from public.system_signals s where s.status='active'),'[]'::jsonb));
$$;
revoke all on function public.home_readiness_context() from public,anon;
grant execute on function public.home_readiness_context() to authenticated;

do $$ declare r record;begin
 for r in select id from public.robot_issues where not archived and severity='critical' and status<>'resolved' loop
 perform public.reconcile_readiness_signal('CRITICAL_ROBOT_ISSUE',r.id);end loop;
 for r in select id from public.frc_parts_inventory where stock_alert_enabled and not archived loop
 perform public.reconcile_readiness_signal('STOCK_BELOW_MINIMUM',r.id);end loop;
end$$;
commit;
