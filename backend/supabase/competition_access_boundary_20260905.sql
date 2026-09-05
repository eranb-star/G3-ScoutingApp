-- Competition access boundary: administrators control assignments and official
-- briefings; members may confirm their own assignment and collaborate on pit work.
begin;

drop policy if exists "members create competition_assignments" on public.competition_assignments;
drop policy if exists "members update competition_assignments" on public.competition_assignments;
drop policy if exists "admins create competition assignments" on public.competition_assignments;
drop policy if exists "admins or assignees update competition assignments" on public.competition_assignments;
create policy "admins create competition assignments" on public.competition_assignments
for insert to authenticated
with check(public.is_admin() and assigned_by=auth.uid());
create policy "admins or assignees update competition assignments" on public.competition_assignments
for update to authenticated
using(public.is_admin() or member_id=auth.uid())
with check(public.is_admin() or member_id=auth.uid());

create or replace function public.protect_competition_assignment_fields()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if public.is_admin() then return new; end if;
  if new.event_id is distinct from old.event_id
     or new.match_id is distinct from old.match_id
     or new.member_id is distinct from old.member_id
     or new.role is distinct from old.role
     or new.assigned_by is distinct from old.assigned_by then
    raise exception 'Only administrators can change assignment details';
  end if;
  if new.status not in ('confirmed','completed','absent','replacement_requested') then
    raise exception 'Invalid member assignment status';
  end if;
  return new;
end$$;
drop trigger if exists protect_competition_assignment_fields on public.competition_assignments;
create trigger protect_competition_assignment_fields
before update on public.competition_assignments
for each row execute function public.protect_competition_assignment_fields();

drop policy if exists "members create competition_briefings" on public.competition_briefings;
drop policy if exists "members update competition_briefings" on public.competition_briefings;
drop policy if exists "admins create competition briefings" on public.competition_briefings;
drop policy if exists "admins update competition briefings" on public.competition_briefings;
create policy "admins create competition briefings" on public.competition_briefings
for insert to authenticated with check(public.is_admin() and created_by=auth.uid());
create policy "admins update competition briefings" on public.competition_briefings
for update to authenticated using(public.is_admin()) with check(public.is_admin());

drop policy if exists "members create competition_pit_queue" on public.competition_pit_queue;
drop policy if exists "members update competition_pit_queue" on public.competition_pit_queue;
drop policy if exists "members report pit work" on public.competition_pit_queue;
drop policy if exists "responsible members update pit work" on public.competition_pit_queue;
create policy "members report pit work" on public.competition_pit_queue
for insert to authenticated
with check(public.current_team_role() is not null and reported_by=auth.uid());
create policy "responsible members update pit work" on public.competition_pit_queue
for update to authenticated
using(public.is_admin() or owner_id=auth.uid() or reported_by=auth.uid())
with check(public.is_admin() or owner_id=auth.uid() or reported_by=auth.uid());

commit;
