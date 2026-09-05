begin;
alter table public.pit_scouting_reports add column if not exists review_note text;
alter table public.pit_scouting_reports add column if not exists reviewed_by uuid references public.team_members(id);
alter table public.pit_scouting_reports add column if not exists reviewed_at timestamptz;

create or replace function public.review_pit_scouting_report(target_report uuid,target_status text,review_reason text)
returns uuid language plpgsql security definer set search_path=public as $$
declare event_target uuid;
begin
 if public.current_team_role() not in('team_leader','mentor','admin') then raise exception 'Not authorized to review pit evidence'; end if;
 if target_status not in('verified','needs_review') then raise exception 'Invalid review status'; end if;
 if nullif(trim(review_reason),'') is null then raise exception 'A review note is required'; end if;
 update public.pit_scouting_reports set status=target_status,review_note=trim(review_reason),reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now() where id=target_report returning event_id into event_target;
 if event_target is null then raise exception 'Pit report not found'; end if;
 return target_report;
end$$;
revoke all on function public.review_pit_scouting_report(uuid,text,text) from public;
grant execute on function public.review_pit_scouting_report(uuid,text,text) to authenticated;
commit;
