-- Preserve calendar cancellation across the linked milestone responsibility.
-- Idempotent; keeps source records and per-member state/history intact.
begin;

create or replace function public.guard_cancelled_milestone_action()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.source_table='season_milestones' and exists (
    select 1 from public.team_calendar_events c
    where c.source_table='season_milestones' and c.source_id=new.source_id and c.cancelled
  ) then
    new.cancelled := true;
  end if;
  return new;
end;
$$;

drop trigger if exists cancelled_calendar_guards_milestone_action on public.team_actions;
create trigger cancelled_calendar_guards_milestone_action
before insert or update on public.team_actions
for each row execute function public.guard_cancelled_milestone_action();

create or replace function public.cancel_calendar_milestone_action()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.cancelled and new.source_table='season_milestones' then
    update public.team_actions
    set cancelled=true
    where source_table='season_milestones' and source_id=new.source_id and not cancelled;
  end if;
  return new;
end;
$$;

drop trigger if exists cancelled_calendar_cancels_milestone_action on public.team_calendar_events;
create trigger cancelled_calendar_cancels_milestone_action
after insert or update on public.team_calendar_events
for each row execute function public.cancel_calendar_milestone_action();

-- Repair only explicitly linked, already-cancelled calendar entries.
-- Never match or delete records by title.
update public.team_actions a set cancelled=true
where a.source_table='season_milestones' and not a.cancelled
  and exists (
    select 1 from public.team_calendar_events c
    where c.source_table='season_milestones' and c.source_id=a.source_id and c.cancelled
  );

revoke all on function public.guard_cancelled_milestone_action() from public;
revoke all on function public.cancel_calendar_milestone_action() from public;
commit;
