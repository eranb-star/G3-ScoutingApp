-- Prevent one person or one scouting station from being assigned twice in a match.
-- Existing historical rows are preserved; conflicting future writes are rejected.
begin;

create or replace function public.prevent_competition_assignment_overlap()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.match_id is null or new.status='absent' then return new; end if;
  if exists(
    select 1 from public.competition_assignments existing
    where existing.event_id=new.event_id and existing.match_id=new.match_id
      and existing.member_id=new.member_id and existing.status<>'absent'
      and existing.id<>new.id
  ) then raise exception 'This member already has an assignment for this match'; end if;
  if exists(
    select 1 from public.competition_assignments existing
    where existing.event_id=new.event_id and existing.match_id=new.match_id
      and existing.role=new.role and existing.status<>'absent'
      and existing.id<>new.id
  ) then raise exception 'This station already has an assigned member for this match'; end if;
  return new;
end$$;

drop trigger if exists prevent_competition_assignment_overlap on public.competition_assignments;
create trigger prevent_competition_assignment_overlap
before insert or update of event_id,match_id,member_id,role,status on public.competition_assignments
for each row execute function public.prevent_competition_assignment_overlap();

commit;
