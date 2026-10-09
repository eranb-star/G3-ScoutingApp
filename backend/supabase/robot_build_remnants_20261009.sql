begin;
create table if not exists public.robot_build_remnants(
 id uuid primary key,material_id uuid not null references public.robot_build_materials(id),
 part_id uuid not null references public.frc_parts_inventory(id),amount numeric(14,4) not null check(amount>0),
 unit text not null,source_spec jsonb not null,remnant_spec jsonb not null,
 actor_id uuid not null references public.team_members(id),expected_revision integer not null,
 note text not null,created_at timestamptz not null default now()
);
alter table public.robot_build_remnants enable row level security;
revoke all on public.robot_build_remnants from public,anon,authenticated;
grant select on public.robot_build_remnants to authenticated;
drop policy if exists build_remnant_read on public.robot_build_remnants;
create policy build_remnant_read on public.robot_build_remnants for select to authenticated using(exists(select 1 from public.robot_build_materials where id=material_id));

create or replace function public.record_robot_build_remnant(p_material uuid,p_part uuid,p_amount numeric,p_expected integer,p_note text,p_request uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare m public.robot_build_materials%rowtype;j public.robot_build_jobs%rowtype;t public.project_tasks%rowtype;
 i public.frc_parts_inventory%rowtype;target public.frc_parts_inventory%rowtype;
 s public.robot_build_stock_specs%rowtype;r public.robot_build_stock_specs%rowtype;e public.robot_build_remnants%rowtype;
begin
 perform pg_advisory_xact_lock(6740,911);
 select * into m from public.robot_build_materials where id=p_material for update;
 select * into j from public.robot_build_jobs where id=m.job_id;select * into t from public.project_tasks where id=j.task_id;
 if m.id is null or not exists(select 1 from public.team_members where id=auth.uid() and active)
 or not exists(select 1 from public.team_projects where id=t.project_id and public.has_permission('manage_inventory',subteam) and public.has_permission('assign_team_work',subteam)) then raise exception 'Project and inventory manager required';end if;
 select * into e from public.robot_build_remnants where id=p_request;
 if e.id is not null then
  if e.material_id=p_material and e.part_id=p_part and e.amount=p_amount and e.expected_revision=p_expected and e.actor_id=auth.uid() and e.note=trim(p_note) then return;end if;
  raise exception 'Request identity already used';end if;
 if p_request is null or p_expected is null or m.revision<>p_expected then raise exception 'Material changed; reload before recording the remnant';end if;
 if p_amount is null or p_amount<=0 or p_amount>m.consumed or p_amount<>round(p_amount,4) or length(trim(coalesce(p_note,''))) not between 3 and 2000 then raise exception 'Enter measured recoverable quantity within net consumed material and its location';end if;
 if t.archived or t.status='done' or exists(select 1 from public.team_projects where id=t.project_id and status in ('completed','archived'))
 or not public.robot_build_review_usable(j.release_task_id)
 or not exists(select 1 from public.project_review_gates where task_id=j.release_task_id and current_submission=j.release_submission_id)
 or exists(select 1 from public.project_review_gates where task_id=t.id and current_submission is not null) then raise exception 'Active released work with inspection open required';end if;
 select * into i from public.frc_parts_inventory where id=m.part_id and not archived for update;
 select * into target from public.frc_parts_inventory where id=p_part and not archived for update;
 select * into s from public.robot_build_stock_specs where part_id=m.part_id;
 select * into r from public.robot_build_stock_specs where part_id=p_part;
 if target.id is null or i.id is null or target.id=i.id or target.unit<>m.unit or i.unit<>m.unit then raise exception 'Choose a distinct remnant inventory item with the same ledger unit';end if;
 if s.revision is distinct from m.stock_spec_revision or not public.robot_build_spec_fits(s.specification,r.specification)
 or s.specification=r.specification then raise exception 'Record compatible smaller measured remnant dimensions first';end if;
 -- Reclassify only material already withdrawn. Never also refund the original blank.
 update public.robot_build_materials set consumed=consumed-p_amount,revision=revision+1 where id=m.id;
 update public.frc_parts_inventory set quantity=quantity+p_amount,updated_at=now() where id=target.id;
 insert into public.frc_stock_movements(part_id,quantity_delta,reason,note,member_id)
 values(target.id,p_amount,'returned','Measured remnant from build material '||m.id||': '||trim(p_note),auth.uid());
 insert into public.robot_build_remnants(id,material_id,part_id,amount,unit,source_spec,remnant_spec,actor_id,expected_revision,note)
 values(p_request,m.id,target.id,p_amount,m.unit,s.specification,r.specification,auth.uid(),p_expected,trim(p_note));
end$$;
create or replace function public.guard_robot_build_remnant_spec()returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if new.specification is distinct from old.specification and exists(select 1 from public.robot_build_remnants where part_id=old.part_id) then
 raise exception 'Remnant stock identity is already recorded; create another inventory item for different dimensions';end if;
 return new;
end$$;
drop trigger if exists guard_robot_build_remnant_spec on public.robot_build_stock_specs;
create trigger guard_robot_build_remnant_spec before update on public.robot_build_stock_specs for each row execute function public.guard_robot_build_remnant_spec();
revoke all on function public.guard_robot_build_remnant_spec() from public,anon,authenticated;
revoke all on function public.record_robot_build_remnant(uuid,uuid,numeric,integer,text,uuid) from public,anon;
grant execute on function public.record_robot_build_remnant(uuid,uuid,numeric,integer,text,uuid) to authenticated;
commit;
