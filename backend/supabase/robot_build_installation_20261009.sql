begin;
create table if not exists public.robot_build_kits(
 id uuid primary key,task_id uuid not null unique references public.project_tasks(id),name text not null,
 created_by uuid not null references public.team_members(id),created_at timestamptz not null default now(),
 configuration_id uuid references public.project_robot_configurations(id),installation_submission uuid references public.project_review_submissions(id),installed_at timestamptz,
 retired_at timestamptz,retirement_note text
);
alter table public.robot_build_kits add column if not exists retest_task_id uuid references public.project_tasks(id);
create table if not exists public.robot_build_kit_items(
 kit_id uuid not null references public.robot_build_kits(id),batch_id uuid not null references public.robot_build_batches(id),
 quantity integer not null check(quantity>=0),revision integer not null default 1,primary key(kit_id,batch_id)
);
create table if not exists public.robot_build_kit_events(
 id uuid primary key,kit_id uuid not null references public.robot_build_kits(id),batch_id uuid references public.robot_build_batches(id),
 action text not null,quantity integer not null default 0,expected_revision integer not null default 0,
 actor_id uuid not null references public.team_members(id),note text not null,created_at timestamptz not null default now()
);
alter table public.robot_build_kits enable row level security;
alter table public.robot_build_kit_items enable row level security;
alter table public.robot_build_kit_events enable row level security;
revoke all on public.robot_build_kits,public.robot_build_kit_items,public.robot_build_kit_events from public,anon,authenticated;
grant select on public.robot_build_kits,public.robot_build_kit_items,public.robot_build_kit_events to authenticated;
drop policy if exists kit_read on public.robot_build_kits;
create policy kit_read on public.robot_build_kits for select to authenticated using(exists(select 1 from public.team_members where id=auth.uid() and active) and exists(select 1 from public.project_tasks where id=task_id));
drop policy if exists kit_item_read on public.robot_build_kit_items;
create policy kit_item_read on public.robot_build_kit_items for select to authenticated using(exists(select 1 from public.robot_build_kits where id=kit_id));
drop policy if exists kit_event_read on public.robot_build_kit_events;
create policy kit_event_read on public.robot_build_kit_events for select to authenticated using(exists(select 1 from public.robot_build_kits where id=kit_id));

create or replace function public.create_robot_build_kit(p_task uuid,p_name text,p_request uuid)returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare result uuid;t public.project_tasks%rowtype;
begin
 perform pg_advisory_xact_lock(6740,911);select * into t from public.project_tasks where id=p_task;
 if t.id is null or t.archived or t.status='done' or not exists(select 1 from public.team_members where id=auth.uid() and active)
 or not exists(select 1 from public.team_projects where id=t.project_id and status not in ('completed','archived') and public.has_permission('assign_team_work',subteam)) then raise exception 'Choose an active project installation task';end if;
 if not exists(select 1 from public.project_review_gates where task_id=t.id and enabled and decision_type='installed') then raise exception 'Configure the existing task installation checkpoint first';end if;
 select id into result from public.robot_build_kits where task_id=t.id;
 if result is not null then
  if exists(select 1 from public.robot_build_kits where id=result and name=trim(p_name)) then return result;end if;
  raise exception 'This task already has a different assembly kit';end if;
 if p_request is null or length(trim(coalesce(p_name,''))) not between 3 and 180 then raise exception 'Enter an assembly kit name';end if;
 insert into public.robot_build_kits(id,task_id,name,created_by)values(p_request,t.id,trim(p_name),auth.uid());return p_request;
end$$;

create or replace function public.move_robot_build_kit(p_kit uuid,p_batch uuid,p_action text,p_quantity integer,p_expected integer,p_note text,p_request uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare k public.robot_build_kits%rowtype;t public.project_tasks%rowtype;b public.robot_build_batches%rowtype;j public.robot_build_jobs%rowtype;i public.robot_build_kit_items%rowtype;e public.robot_build_kit_events%rowtype;available integer;delta integer;physical numeric;printing numeric;
begin
 perform pg_advisory_xact_lock(6740,911);select * into k from public.robot_build_kits where id=p_kit for update;select * into t from public.project_tasks where id=k.task_id;
 if k.id is null or not exists(select 1 from public.team_members where id=auth.uid() and active)
 or not exists(select 1 from public.team_projects where id=t.project_id and public.has_permission('assign_team_work',subteam) and public.has_permission('manage_inventory',subteam)) then raise exception 'Project and inventory manager required';end if;
 select * into e from public.robot_build_kit_events where id=p_request;
 if e.id is not null then
  if e.kit_id=p_kit and e.batch_id=p_batch and e.action=p_action and e.quantity=p_quantity and e.expected_revision=p_expected and e.actor_id=auth.uid() and e.note=trim(p_note) then return;end if;
  raise exception 'Request identity already used';end if;
 if k.installed_at is not null or k.retired_at is not null or t.archived or t.status='done' or exists(select 1 from public.team_projects where id=t.project_id and status in ('archived','completed')) then raise exception 'Installed or closed kit contents are immutable; create a replacement kit and configuration';end if;
 if exists(select 1 from public.project_review_gates where task_id=t.id and current_submission is not null) then raise exception 'Reopen installation review before changing submitted kit contents';end if;
 if p_request is null or p_action is null or p_action not in ('issue','return') or p_quantity is null or p_quantity<=0 or length(trim(coalesce(p_note,''))) not between 3 and 2000 then raise exception 'Choose issue or return, positive pieces and a traceability note';end if;
 select * into b from public.robot_build_batches where id=p_batch;select * into j from public.robot_build_jobs where id=b.job_id;
 if b.id is null or b.project_id is distinct from t.project_id then raise exception 'Choose an accepted batch from this project';end if;
 select * into i from public.robot_build_kit_items where kit_id=k.id and batch_id=b.id for update;
 if coalesce(i.revision,0)<>p_expected then raise exception 'Kit contents changed. Reload before saving';end if;
 delta:=case when p_action='issue' then p_quantity else -p_quantity end;
 if coalesce(i.quantity,0)+delta<0 then raise exception 'Return exceeds the quantity in this kit';end if;
 if p_action='issue' then
  if not exists(select 1 from public.project_review_gates where task_id=b.source_task_id and current_submission=b.qc_submission_id and public.project_review_passed(task_id))
   or (b.job_id is not null and not exists(select 1 from public.project_review_gates where task_id=j.release_task_id and current_submission=j.release_submission_id and public.project_review_passed(task_id))) then raise exception 'Batch release or QC changed; review before issuing';end if;
  select b.quantity-coalesce(sum(quantity),0) into available from public.robot_build_kit_items where batch_id=b.id;
  if available<p_quantity then raise exception 'This batch does not have enough unallocated pieces';end if;
 end if;
 select quantity into physical from public.frc_parts_inventory where id=b.part_id and not archived and unit='pcs' for update;
 select coalesce(sum((x->>'grams')::numeric*f.quantity/1000),0)into printing from public.fundraising_jobs f cross join lateral jsonb_array_elements(f.snapshot->'materials') x where f.status='printing' and x->>'part_id'=b.part_id::text;
 if physical is null or physical-delta<public.robot_build_reserved(b.part_id)+printing then raise exception 'Not enough unreserved physical stock';end if;
 insert into public.robot_build_kit_items(kit_id,batch_id,quantity)values(k.id,b.id,greatest(delta,0))
 on conflict(kit_id,batch_id)do update set quantity=robot_build_kit_items.quantity+delta,revision=robot_build_kit_items.revision+1;
 update public.frc_parts_inventory set quantity=quantity-delta,updated_at=now() where id=b.part_id;
 insert into public.frc_stock_movements(part_id,quantity_delta,reason,note,member_id)values(b.part_id,-delta,case when delta>0 then 'used' else 'returned' end,'Assembly kit '||k.id||': '||trim(p_note),auth.uid());
 insert into public.robot_build_kit_events(id,kit_id,batch_id,action,quantity,expected_revision,actor_id,note)values(p_request,k.id,b.id,p_action,p_quantity,p_expected,auth.uid(),trim(p_note));
end$$;

create or replace function public.install_robot_build_kit(p_kit uuid,p_configuration uuid,p_note text,p_request uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare k public.robot_build_kits%rowtype;t public.project_tasks%rowtype;c public.project_robot_configurations%rowtype;s public.project_review_submissions%rowtype;
begin
 perform pg_advisory_xact_lock(6740,911);select * into k from public.robot_build_kits where id=p_kit for update;select * into t from public.project_tasks where id=k.task_id;
 if k.id is null or not exists(select 1 from public.team_members where id=auth.uid() and active) or not exists(select 1 from public.team_projects where id=t.project_id and public.has_permission('assign_team_work',subteam)) then raise exception 'Project manager required';end if;
 if k.installed_at is not null then
  if k.configuration_id=p_configuration then return;end if;raise exception 'Installation is pinned to its original configuration';end if;
 select * into c from public.project_robot_configurations where id=p_configuration and project_id=t.project_id and configuration_kind='as_installed';
 select sub.* into s from public.project_review_gates g join public.project_review_submissions sub on sub.id=g.current_submission where g.task_id=t.id and g.enabled and g.decision_type='installed' and public.project_review_passed(t.id);
 if c.id is null or s.id is null or s.revision<>c.revision or not exists(select 1 from jsonb_each(s.requirement_results) r where r.value->'configuration_snapshot'->>'id'=c.id::text)
 then raise exception 'Current installation approval must reference this exact installed configuration and revision';end if;
 if not exists(select 1 from public.robot_build_kit_items where kit_id=k.id and quantity>0) then raise exception 'Issue accepted batches into this kit first';end if;
 if exists(select 1 from public.robot_build_kit_items ki join public.robot_build_batches b on b.id=ki.batch_id left join public.robot_build_jobs j on j.id=b.job_id where ki.kit_id=k.id and ki.quantity>0 and (
 not exists(select 1 from public.project_review_gates where task_id=b.source_task_id and current_submission=b.qc_submission_id and public.project_review_passed(task_id)) or
 (b.job_id is not null and not exists(select 1 from public.project_review_gates where task_id=j.release_task_id and current_submission=j.release_submission_id and public.project_review_passed(task_id))))) then raise exception 'An included batch needs renewed release or QC review';end if;
 if p_request is null or length(trim(coalesce(p_note,''))) not between 3 and 2000 then raise exception 'Record installation location and verification reference';end if;
 update public.robot_build_kits set configuration_id=c.id,installation_submission=s.id,installed_at=now() where id=k.id;
 insert into public.robot_build_kit_events(id,kit_id,action,actor_id,note)values(p_request,k.id,'installed',auth.uid(),trim(p_note));
end$$;
create or replace function public.replace_robot_build_kit(p_previous uuid,p_replacement uuid,p_note text,p_request uuid,p_retest uuid)returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare oldkit public.robot_build_kits%rowtype;newkit public.robot_build_kits%rowtype;project uuid;oldasset text;newasset text;
begin
 perform pg_advisory_xact_lock(6740,911);select * into oldkit from public.robot_build_kits where id=p_previous for update;select * into newkit from public.robot_build_kits where id=p_replacement;
 select project_id into project from public.project_tasks where id=oldkit.task_id;
 if not exists(select 1 from public.team_members where id=auth.uid() and active) or not exists(select 1 from public.team_projects where id=project and public.has_permission('assign_team_work',subteam)) then raise exception 'Project manager required';end if;
 if oldkit.id is null or newkit.id is null or oldkit.id=newkit.id or oldkit.installed_at is null or newkit.installed_at is null or newkit.retired_at is not null or oldkit.configuration_id=newkit.configuration_id
 or not exists(select 1 from public.project_tasks where id=newkit.task_id and project_id=project) then raise exception 'Choose a newly inspected installation in a different configuration of this project';end if;
 select identity_snapshot->'asset'->>'id' into oldasset from public.project_robot_configurations where id=oldkit.configuration_id;
 select identity_snapshot->'asset'->>'id' into newasset from public.project_robot_configurations where id=newkit.configuration_id;
 if oldasset is null or oldasset is distinct from newasset then raise exception 'Replacement must identify the same physical asset';end if;
  if not exists(select 1 from public.project_tasks t join public.project_review_gates g on g.task_id=t.id where t.id=p_retest and t.project_id=project and not t.archived and t.status<>'done' and g.enabled and g.decision_type in ('verified_on_robot','competition_ready')) then raise exception 'Choose an open robot verification task for the replacement configuration';end if;
 if not exists(select 1 from public.project_review_gates where task_id=newkit.task_id and current_submission=newkit.installation_submission and public.project_review_passed(task_id)) then raise exception 'Replacement installation approval is no longer current';end if;
 if oldkit.retired_at is not null then
  if exists(select 1 from public.robot_build_kit_events where id=p_request and kit_id=oldkit.id and oldkit.retest_task_id=p_retest and action='replaced' and note=trim(p_note)||' | replacement='||newkit.id) then return;end if;
  raise exception 'Previous installation was already retired';end if;
 if p_request is null or length(trim(coalesce(p_note,''))) not between 3 and 2000 then raise exception 'Record removal disposition and required retests';end if;
 update public.robot_build_kits set retired_at=now(),retest_task_id=p_retest,retirement_note=trim(p_note)||' | replacement='||newkit.id where id=oldkit.id;
 insert into public.robot_build_kit_events(id,kit_id,action,actor_id,note)values(p_request,oldkit.id,'replaced',auth.uid(),trim(p_note)||' | replacement='||newkit.id);
end$$;
revoke all on function public.replace_robot_build_kit(uuid,uuid,text,uuid,uuid) from public,anon;
grant execute on function public.replace_robot_build_kit(uuid,uuid,text,uuid,uuid) to authenticated;
revoke all on function public.create_robot_build_kit(uuid,text,uuid),public.move_robot_build_kit(uuid,uuid,text,integer,integer,text,uuid),public.install_robot_build_kit(uuid,uuid,text,uuid) from public,anon;
grant execute on function public.create_robot_build_kit(uuid,text,uuid),public.move_robot_build_kit(uuid,uuid,text,integer,integer,text,uuid),public.install_robot_build_kit(uuid,uuid,text,uuid) to authenticated;
commit;
