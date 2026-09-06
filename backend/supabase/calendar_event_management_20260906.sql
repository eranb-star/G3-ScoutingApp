begin;

create or replace function public.cancel_team_calendar_event(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  calendar_event public.team_calendar_events%rowtype;
begin
  select * into calendar_event
  from public.team_calendar_events
  where id = p_event_id
  for update;

  if not found then
    raise exception 'Calendar event not found';
  end if;

  if not public.has_permission(
    'manage_team_calendar',
    case when calendar_event.target_type = 'subteam' then calendar_event.target_value else null end
  ) then
    raise exception 'You do not have permission to delete this calendar event';
  end if;

  update public.team_calendar_events
  set cancelled = true
  where id = p_event_id;
end;
$$;

revoke all on function public.cancel_team_calendar_event(uuid) from public;
grant execute on function public.cancel_team_calendar_event(uuid) to authenticated;

commit;
