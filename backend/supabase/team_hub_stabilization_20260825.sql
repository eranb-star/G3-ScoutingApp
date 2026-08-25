-- Mobile-management stabilization policies and lifecycle fields.
-- Safe to run repeatedly.

alter table public.project_tasks add column if not exists archived boolean not null default false;

drop policy if exists "members read applicable announcements" on public.announcements;
create policy "members read applicable announcements" on public.announcements
for select to authenticated using (
  public.is_admin()
  or (
    not archived and (expires_at is null or expires_at > now()) and
    (audience = 'all'
      or audience = public.current_team_role() || 's'
      or (audience = 'subteam' and audience_subteam = (select subteam from public.team_members where id = auth.uid())))
  )
);

drop policy if exists "admins update announcements" on public.announcements;
create policy "admins update announcements" on public.announcements
for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins delete announcements" on public.announcements;
create policy "admins delete announcements" on public.announcements
for delete to authenticated using (public.is_admin());

drop policy if exists "members view projects" on public.team_projects;
create policy "members view projects" on public.team_projects
for select to authenticated using (public.current_team_role() is not null and (status <> 'archived' or public.is_admin()));

drop policy if exists "admins delete projects" on public.team_projects;
create policy "admins delete projects" on public.team_projects
for delete to authenticated using (public.is_admin());

drop policy if exists "members view tasks" on public.project_tasks;
create policy "members view tasks" on public.project_tasks
for select to authenticated using (public.current_team_role() is not null and (not archived or public.is_admin()));

drop policy if exists "admins manage tasks" on public.project_tasks;
create policy "admins manage tasks" on public.project_tasks
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.close_stale_workshop_sessions()
returns integer language plpgsql security definer set search_path=public as $$
declare closed_count integer;
begin
  update public.team_meetings set status='closed',closed_at=now()
  where status='open' and ends_at < now();
  get diagnostics closed_count = row_count;
  update public.attendance_records a set checked_out_at=m.ends_at,check_out_method='automatic',updated_at=now()
  from public.team_meetings m
  where a.meeting_id=m.id and a.checked_out_at is null and m.status='closed';
  return closed_count;
end; $$;
grant execute on function public.close_stale_workshop_sessions() to authenticated;

create table if not exists public.tool_certifications (
  tool_id uuid not null references public.workshop_tools(id) on delete cascade,
  member_id uuid not null references public.team_members(id) on delete cascade,
  certified_by uuid not null references public.team_members(id),
  certified_at timestamptz not null default now(),
  primary key (tool_id,member_id)
);
alter table public.tool_certifications enable row level security;
drop policy if exists "members read tool certifications" on public.tool_certifications;
create policy "members read tool certifications" on public.tool_certifications
for select to authenticated using (member_id=auth.uid() or public.is_admin());
drop policy if exists "admins manage tool certifications" on public.tool_certifications;
create policy "admins manage tool certifications" on public.tool_certifications
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.checkout_tool(target_tool uuid, expected_return timestamptz default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare checkout_id uuid; training_required boolean;
begin
  if public.current_team_role() is null then raise exception 'Active member access required'; end if;
  select requires_training into training_required from public.workshop_tools where id=target_tool and status='available';
  if not found then raise exception 'Equipment is unavailable'; end if;
  if training_required and not public.is_admin() and not exists(select 1 from public.tool_certifications where tool_id=target_tool and member_id=auth.uid()) then
    raise exception 'Training authorization is required before this equipment can be checked out';
  end if;
  insert into public.tool_checkouts(tool_id,member_id,expected_return_at) values(target_tool,auth.uid(),expected_return) returning id into checkout_id;
  return checkout_id;
end; $$;
grant execute on function public.checkout_tool(uuid,timestamptz) to authenticated;

create or replace function public.set_tool_certification(target_tool uuid,target_member uuid,is_certified boolean)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if is_certified then
    insert into public.tool_certifications(tool_id,member_id,certified_by) values(target_tool,target_member,auth.uid())
    on conflict(tool_id,member_id) do update set certified_by=excluded.certified_by,certified_at=now();
  else
    delete from public.tool_certifications where tool_id=target_tool and member_id=target_member;
  end if;
end; $$;
grant execute on function public.set_tool_certification(uuid,uuid,boolean) to authenticated;
