-- G3 6740: make pit coverage and owned pit-queue work first-class responsibilities.
-- Safe to run repeatedly after unified_responsibility_engine_20260902.sql and
-- competition_guided_pit_phase45_20260905.sql.
begin;

create or replace function public.sync_pit_scouting_assignment_action()
returns trigger language plpgsql security definer set search_path=public as $$
declare event_name text;
begin
  select name into event_name from public.events where id=new.event_id;
  insert into public.team_actions(title,details,action_type,target_type,target_value,priority,source_table,source_id,destination,created_by,cancelled)
  values(
    'Pit scout team '||new.team_number,
    coalesce(event_name,'Competition')||' · Complete the guided pit scouting profile for team '||new.team_number||'.',
    'assignment','member',new.member_id::text,'high','pit_scouting_assignments',new.id,
    '/competition/pit-scouting?assignment='||new.id,new.assigned_by,
    new.status in ('completed','cancelled')
  )
  on conflict(source_table,source_id) where source_table is not null and source_id is not null
  do update set title=excluded.title,details=excluded.details,target_value=excluded.target_value,
    destination=excluded.destination,created_by=excluded.created_by,cancelled=excluded.cancelled;
  return new;
end $$;

drop trigger if exists pit_scouting_assignment_to_action on public.pit_scouting_assignments;
create trigger pit_scouting_assignment_to_action
after insert or update on public.pit_scouting_assignments
for each row execute function public.sync_pit_scouting_assignment_action();

create or replace function public.sync_pit_queue_action()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.owner_id is null then
    update public.team_actions set cancelled=true
    where source_table='competition_pit_queue' and source_id=new.id;
    return new;
  end if;
  insert into public.team_actions(title,details,action_type,target_type,target_value,priority,source_table,source_id,destination,created_by,cancelled)
  values(
    new.title,coalesce(new.details,'Competition pit task'),'assignment','member',new.owner_id::text,
    case when new.severity in ('critical','high') then 'high' else 'normal' end,
    'competition_pit_queue',new.id,'/competition?tab=pit&item='||new.id,new.reported_by,
    new.status in ('done','cancelled')
  )
  on conflict(source_table,source_id) where source_table is not null and source_id is not null
  do update set title=excluded.title,details=excluded.details,target_value=excluded.target_value,
    priority=excluded.priority,destination=excluded.destination,cancelled=excluded.cancelled;
  return new;
end $$;

drop trigger if exists pit_queue_to_action on public.competition_pit_queue;
create trigger pit_queue_to_action after insert or update on public.competition_pit_queue
for each row execute function public.sync_pit_queue_action();

-- Backfill active work without duplicating existing action rows.
insert into public.team_actions(title,details,action_type,target_type,target_value,priority,source_table,source_id,destination,created_by,cancelled)
select 'Pit scout team '||p.team_number,coalesce(e.name,'Competition')||' · Complete the guided pit scouting profile for team '||p.team_number||'.',
  'assignment','member',p.member_id::text,'high','pit_scouting_assignments',p.id,
  '/competition/pit-scouting?assignment='||p.id,p.assigned_by,false
from public.pit_scouting_assignments p left join public.events e on e.id=p.event_id
where p.status not in ('completed','cancelled')
on conflict(source_table,source_id) where source_table is not null and source_id is not null do nothing;

insert into public.team_actions(title,details,action_type,target_type,target_value,priority,source_table,source_id,destination,created_by,cancelled)
select q.title,coalesce(q.details,'Competition pit task'),'assignment','member',q.owner_id::text,
  case when q.severity in ('critical','high') then 'high' else 'normal' end,
  'competition_pit_queue',q.id,'/competition?tab=pit&item='||q.id,q.reported_by,false
from public.competition_pit_queue q
where q.owner_id is not null and q.status not in ('done','cancelled')
on conflict(source_table,source_id) where source_table is not null and source_id is not null do nothing;

commit;
