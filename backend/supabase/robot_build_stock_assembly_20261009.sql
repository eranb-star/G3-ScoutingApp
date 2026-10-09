-- Bench assemblies reuse issued kit components and the existing physical QC workflow.
begin;
alter table public.robot_build_kits add column if not exists stock_output_part_id uuid references public.frc_parts_inventory(id);
alter table public.robot_build_kits add column if not exists stock_output_quantity integer check(stock_output_quantity>0);
alter table public.robot_build_kits add column if not exists stock_received_at timestamptz;
alter table public.robot_build_batches add column if not exists assembly_kit_id uuid unique references public.robot_build_kits(id);
alter table public.robot_build_batches drop constraint if exists robot_build_batches_origin_check;
alter table public.robot_build_batches add constraint robot_build_batches_origin_check check(origin in ('manufactured','existing_stock','stock_assembly'));

create or replace function public.create_robot_stock_assembly(p_task uuid,p_name text,p_part uuid,p_quantity integer,p_request uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare t public.project_tasks%rowtype;k public.robot_build_kits%rowtype;
begin
 perform pg_advisory_xact_lock(6740,911);select * into t from public.project_tasks where id=p_task;
 if t.id is null or not exists(select 1 from public.team_members where id=auth.uid() and active)
 or not exists(select 1 from public.team_projects where id=t.project_id and public.has_permission('assign_team_work',subteam) and public.has_permission('manage_inventory',subteam)) then raise exception 'Project and inventory manager required';end if;
 select * into k from public.robot_build_kits where id=p_request;
 if k.id is not null then
  if k.task_id=p_task and k.name=trim(p_name) and k.stock_output_part_id=p_part and k.stock_output_quantity=p_quantity and k.created_by=auth.uid() then return k.id;end if;
  raise exception 'Request identity already used with different values';end if;
 if p_request is null or p_quantity is null or p_quantity not between 1 and 100000 or length(trim(coalesce(p_name,''))) not between 3 and 180 then raise exception 'Enter assembly name and whole output quantity';end if;
 if t.archived or t.status='done' or exists(select 1 from public.team_projects where id=t.project_id and status in ('completed','archived')) then raise exception 'Choose an active assembly inspection task';end if;
 if not exists(select 1 from public.project_review_gates where task_id=t.id and enabled and decision_type='qc_accepted' and current_submission is null) then raise exception 'Configure an unsubmitted physical QC checkpoint first';end if;
 if exists(select 1 from public.robot_build_jobs where task_id=t.id) then raise exception 'Use a separate stock assembly inspection task, not an existing manufacturing job';end if;
 if not exists(select 1 from public.frc_parts_inventory where id=p_part and not archived and unit='pcs') then raise exception 'Choose the finished assembly inventory item in pieces';end if;
 insert into public.robot_build_kits(id,task_id,name,created_by,stock_output_part_id,stock_output_quantity,requirements_required)
 values(p_request,t.id,trim(p_name),auth.uid(),p_part,p_quantity,true);return p_request;
end$$;

create or replace function public.receive_robot_stock_assembly(p_kit uuid,p_configuration uuid,p_note text,p_request uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare k public.robot_build_kits%rowtype;t public.project_tasks%rowtype;c public.project_robot_configurations%rowtype;s public.project_review_submissions%rowtype;b public.robot_build_batches%rowtype;
begin
 perform pg_advisory_xact_lock(6740,911);select * into k from public.robot_build_kits where id=p_kit for update;select * into t from public.project_tasks where id=k.task_id;
 if k.id is null or not exists(select 1 from public.team_members where id=auth.uid() and active)
 or not exists(select 1 from public.team_projects where id=t.project_id and public.has_permission('assign_team_work',subteam) and public.has_permission('manage_inventory',subteam)) then raise exception 'Project and inventory manager required';end if;
 select * into b from public.robot_build_batches where id=p_request;
 if b.id is not null then
  if b.assembly_kit_id=p_kit and k.configuration_id=p_configuration and b.actor_id=auth.uid() and b.note=trim(p_note) then return b.id;end if;
  raise exception 'Request identity already used with different values';end if;
 if k.stock_output_part_id is null or k.stock_received_at is not null or k.installed_at is not null or k.retired_at is not null then raise exception 'Choose an unreceived stock assembly';end if;
 if p_request is null or length(trim(coalesce(p_note,''))) not between 3 and 2000 then raise exception 'Record output identity and storage location';end if;
 select * into c from public.project_robot_configurations where id=p_configuration and project_id=t.project_id and configuration_kind='as_built';
 select sub.* into s from public.project_review_gates g join public.project_review_submissions sub on sub.id=g.current_submission where g.task_id=t.id and g.enabled and g.decision_type='qc_accepted' and public.robot_build_review_usable(t.id);
 if c.id is null or s.id is null or s.revision<>c.revision or not exists(select 1 from jsonb_each(s.requirement_results) r where r.value->'configuration_snapshot'->>'id'=c.id::text)
 or exists(select 1 from jsonb_each(s.requirement_results) r where r.value->'configuration_snapshot'->>'id' is distinct from c.id::text)
 then raise exception 'Approve physical QC for this exact as-built assembly configuration';end if;
 if not exists(select 1 from public.robot_build_kit_requirements where kit_id=k.id)
 or exists(select 1 from public.robot_build_kit_requirements r where r.kit_id=k.id and r.quantity<>(select coalesce(sum(i.quantity),0) from public.robot_build_kit_items i where i.kit_id=r.kit_id and i.line_id=r.line_id))
 or exists(select 1 from public.robot_build_kit_items where kit_id=k.id and quantity>0 and line_id is null) then raise exception 'Issue every planned component before receiving the assembly';end if;
 if exists(select 1 from public.robot_build_kit_items i join public.robot_build_batches x on x.id=i.batch_id left join public.robot_build_jobs j on j.id=x.job_id where i.kit_id=k.id and i.quantity>0 and
 (x.part_id=k.stock_output_part_id or not exists(select 1 from public.project_review_gates where task_id=x.source_task_id and current_submission=x.qc_submission_id and public.robot_build_review_usable(task_id))
 or (j.id is not null and not exists(select 1 from public.project_review_gates where task_id=j.release_task_id and current_submission=j.release_submission_id and public.robot_build_review_usable(task_id))))) then raise exception 'Component identity, release or QC needs review';end if;
 perform 1 from public.frc_parts_inventory where id=k.stock_output_part_id and not archived and unit='pcs' for update;
 if not found then raise exception 'Finished assembly inventory item is unavailable';end if;
 insert into public.robot_build_batches(id,source_task_id,project_id,part_id,quantity,qc_submission_id,origin,assembly_kit_id,actor_id,note)
 values(p_request,k.task_id,t.project_id,k.stock_output_part_id,k.stock_output_quantity,s.id,'stock_assembly',k.id,auth.uid(),trim(p_note));
 update public.frc_parts_inventory set quantity=quantity+k.stock_output_quantity,updated_at=now() where id=k.stock_output_part_id;
 insert into public.frc_stock_movements(part_id,quantity_delta,reason,note,member_id)values(k.stock_output_part_id,k.stock_output_quantity,'received','Stock assembly '||k.id||': '||trim(p_note),auth.uid());
 update public.robot_build_kits set configuration_id=c.id,stock_received_at=now(),retired_at=now(),retirement_note='Consumed into accepted stock assembly '||p_request where id=k.id;
 insert into public.robot_build_kit_events(id,kit_id,action,quantity,actor_id,note)values(p_request,k.id,'stock_received',k.stock_output_quantity,auth.uid(),trim(p_note));
 return p_request;
end$$;
create or replace function public.guard_stock_assembly_installation()returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if new.stock_output_part_id is not null and new.installed_at is not null then raise exception 'Stock assemblies are received to inventory, not recorded as robot installations';end if;
 if new.stock_output_part_id is not null and exists(select 1 from public.robot_build_kit_items i join public.robot_build_batches b on b.id=i.batch_id where i.kit_id=new.id and b.part_id=new.stock_output_part_id and i.quantity>0) then raise exception 'Assembly output cannot be its own component';end if;
 return new;
end$$;
drop trigger if exists guard_stock_assembly_installation on public.robot_build_kits;
create trigger guard_stock_assembly_installation before update on public.robot_build_kits for each row execute function public.guard_stock_assembly_installation();
revoke all on function public.guard_stock_assembly_installation() from public,anon,authenticated;
revoke all on function public.create_robot_stock_assembly(uuid,text,uuid,integer,uuid),public.receive_robot_stock_assembly(uuid,uuid,text,uuid) from public,anon;
grant execute on function public.create_robot_stock_assembly(uuid,text,uuid,integer,uuid),public.receive_robot_stock_assembly(uuid,uuid,text,uuid) to authenticated;
commit;
