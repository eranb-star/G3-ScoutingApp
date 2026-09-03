-- Course governance, milestone de-duplication and match replacement workflow.
-- Safe to run repeatedly after the 2026-08-31 and 2026-09-02 migrations.
begin;

create or replace function public.is_training_editor()
returns boolean language sql stable security definer set search_path=public as $$
  select coalesce(public.current_team_role() in ('admin','mentor'),false);
$$;
grant execute on function public.is_training_editor() to authenticated;

drop policy if exists "admins create courses" on public.training_courses;
drop policy if exists "admins update courses" on public.training_courses;
drop policy if exists "leaders create courses" on public.training_courses;
drop policy if exists "leaders update courses" on public.training_courses;
drop policy if exists "admins delete courses" on public.training_courses;
create policy "leaders create courses" on public.training_courses for insert to authenticated
  with check(public.is_training_editor() and created_by=auth.uid());
create policy "leaders update courses" on public.training_courses for update to authenticated
  using(public.is_training_editor()) with check(public.is_training_editor());
create policy "admins delete courses" on public.training_courses for delete to authenticated
  using(public.is_admin());

drop policy if exists "members create training_modules" on public.training_modules;
drop policy if exists "members update training_modules" on public.training_modules;
drop policy if exists "leaders create modules" on public.training_modules;
drop policy if exists "leaders update modules" on public.training_modules;
drop policy if exists "admins delete modules" on public.training_modules;
create policy "leaders create modules" on public.training_modules for insert to authenticated
  with check(public.is_training_editor());
create policy "leaders update modules" on public.training_modules for update to authenticated
  using(public.is_training_editor()) with check(public.is_training_editor());
create policy "admins delete modules" on public.training_modules for delete to authenticated
  using(public.is_admin());

-- Identify calendar records generated from another business object. This prevents
-- one milestone appearing as both a milestone action and a separate meeting action.
alter table public.team_calendar_events add column if not exists source_table text;
alter table public.team_calendar_events add column if not exists source_id uuid;
create unique index if not exists team_calendar_source_unique on public.team_calendar_events(source_table,source_id)
  where source_table is not null and source_id is not null;

update public.team_calendar_events c set source_table='season_milestones',source_id=m.id
from public.season_milestones m
where c.source_table is null and c.title=m.title and c.starts_at::date=m.due_at;

create or replace function public.publish_milestone_calendar_event() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if new.due_at is not null then
    insert into public.team_calendar_events(title,description,event_type,starts_at,ends_at,all_day,target_type,target_value,mandatory,created_by,source_table,source_id)
    values(new.title,new.details,'deadline',new.due_at::timestamptz,new.due_at::timestamptz+interval '23 hours 59 minutes',true,
      case when new.owner_id is not null then 'member' when new.workstream='team' then 'all' else 'subteam' end,
      case when new.owner_id is not null then new.owner_id::text when new.workstream='team' then null else new.workstream end,
      true,new.created_by,'season_milestones',new.id)
    on conflict(source_table,source_id) where source_table is not null and source_id is not null
    do update set title=excluded.title,description=excluded.description,starts_at=excluded.starts_at,ends_at=excluded.ends_at,
      target_type=excluded.target_type,target_value=excluded.target_value,created_by=excluded.created_by;
  end if;
  return new;
end$$;
drop trigger if exists milestone_to_calendar on public.season_milestones;
create trigger milestone_to_calendar after insert or update on public.season_milestones
for each row execute function public.publish_milestone_calendar_event();

create or replace function public.sync_calendar_action() returns trigger language plpgsql security definer set search_path=public as $$
begin
  perform public.sync_team_action('team_calendar_events',new.id,new.title,new.description,'meeting',new.target_type,new.target_value,
    new.starts_at,case when new.mandatory then 'high' else 'normal' end,'/schedule?event='||new.id,new.created_by,
    new.cancelled or not new.mandatory or new.ends_at<now() or new.source_table is not null);
  return new;
end$$;
update public.team_calendar_events set cancelled=cancelled;

create table if not exists public.competition_replacement_requests(
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.competition_assignments(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  match_id uuid references public.matches(id) on delete cascade,
  requester_id uuid not null references public.team_members(id) on delete cascade,
  candidate_id uuid not null references public.team_members(id) on delete cascade,
  original_status text not null default 'assigned' check(original_status in ('assigned','confirmed')),
  note text,
  status text not null default 'pending' check(status in ('pending','accepted','rejected','cancelled','seen')),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  check(requester_id<>candidate_id)
);
create unique index if not exists one_pending_replacement_per_assignment on public.competition_replacement_requests(assignment_id) where status='pending';
create index if not exists replacement_candidate_inbox on public.competition_replacement_requests(candidate_id,status,created_at desc);
alter table public.competition_replacement_requests enable row level security;
drop policy if exists "participants view replacement requests" on public.competition_replacement_requests;
drop policy if exists "requesters create replacement requests" on public.competition_replacement_requests;
drop policy if exists "participants update replacement requests" on public.competition_replacement_requests;
create policy "participants view replacement requests" on public.competition_replacement_requests for select to authenticated
  using(requester_id=auth.uid() or candidate_id=auth.uid() or public.is_admin());
create policy "requesters create replacement requests" on public.competition_replacement_requests for insert to authenticated
  with check(requester_id=auth.uid() and status='pending' and exists(
    select 1 from public.competition_assignments a where a.id=assignment_id and a.member_id=auth.uid() and a.match_id=competition_replacement_requests.match_id
  ) and not exists(
    select 1 from public.competition_assignments busy where busy.match_id=competition_replacement_requests.match_id
      and busy.member_id=candidate_id and busy.status<>'absent'
  ));
create policy "participants update replacement requests" on public.competition_replacement_requests for update to authenticated
  using(requester_id=auth.uid() or candidate_id=auth.uid() or public.is_admin())
  with check(requester_id=auth.uid() or candidate_id=auth.uid() or public.is_admin());

create or replace function public.prepare_competition_replacement() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  update public.competition_assignments set status='replacement_requested',replacement_note=new.note where id=new.assignment_id;
  perform public.sync_team_action('competition_replacement_requests',new.id,'Replacement request',new.note,'assignment','member',new.candidate_id::text,null,'high','/competition?replacement='||new.id,new.requester_id,false);
  return new;
end$$;
drop trigger if exists prepare_competition_replacement on public.competition_replacement_requests;
create trigger prepare_competition_replacement after insert on public.competition_replacement_requests for each row execute function public.prepare_competition_replacement();

create or replace function public.respond_to_competition_replacement(request_id uuid,response text)
returns void language plpgsql security definer set search_path=public as $$
declare r public.competition_replacement_requests%rowtype;
begin
  if response not in ('accepted','rejected') then raise exception 'Response must be accepted or rejected'; end if;
  select * into r from public.competition_replacement_requests where id=request_id for update;
  if r.id is null or r.status<>'pending' then raise exception 'This replacement request is no longer pending'; end if;
  if r.candidate_id<>auth.uid() and not public.is_admin() then raise exception 'Only the selected member can respond'; end if;
  if response='accepted' then
    if exists(select 1 from public.competition_assignments where match_id=r.match_id and member_id=r.candidate_id and status<>'absent' and id<>r.assignment_id) then raise exception 'The selected member already has a match assignment'; end if;
    update public.competition_assignments set member_id=r.candidate_id,status='confirmed',replacement_note=null where id=r.assignment_id;
  else
    update public.competition_assignments set status=r.original_status,replacement_note=null where id=r.assignment_id;
  end if;
  update public.competition_replacement_requests set status=response,responded_at=now() where id=r.id;
  update public.team_actions set cancelled=true where source_table='competition_replacement_requests' and source_id=r.id;
  perform public.sync_team_action('competition_replacement_response',r.id,
    case when response='accepted' then 'Replacement accepted' else 'Replacement declined' end,
    case when response='accepted' then 'Your match assignment was transferred.' else 'You remain assigned; choose another available member if needed.' end,
    'assignment','member',r.requester_id::text,null,case when response='accepted' then 'normal' else 'high' end,
    '/competition?replacement='||r.id,r.candidate_id,false);
end$$;
grant execute on function public.respond_to_competition_replacement(uuid,text) to authenticated;

commit;
