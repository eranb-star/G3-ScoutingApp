begin;
create table if not exists public.robot_build_assembly_lots(
 id uuid primary key,kit_id uuid not null references public.robot_build_kits(id),task_id uuid not null unique references public.project_tasks(id),
 quantity integer not null check(quantity>0),created_by uuid not null references public.team_members(id),note text not null,
 created_at timestamptz not null default now(),received_at timestamptz,batch_id uuid references public.robot_build_batches(id)
);
alter table public.robot_build_assembly_lots enable row level security;
revoke all on public.robot_build_assembly_lots from public,anon,authenticated;
grant select on public.robot_build_assembly_lots to authenticated;
drop policy if exists build_assembly_lot_read on public.robot_build_assembly_lots;
create policy build_assembly_lot_read on public.robot_build_assembly_lots for select to authenticated using(exists(select 1 from public.robot_build_kits where id=kit_id));
alter table public.robot_build_batches drop constraint if exists robot_build_batches_assembly_kit_id_key;
alter table public.robot_build_batches add column if not exists assembly_lot_id uuid unique references public.robot_build_assembly_lots(id);
create or replace function public.plan_robot_stock_assembly_lot(p_kit uuid,p_task uuid,p_quantity integer,p_note text,p_request uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare k public.robot_build_kits%rowtype;t public.project_tasks%rowtype;l public.robot_build_assembly_lots%rowtype;claimed integer;
begin
 perform pg_advisory_xact_lock(6740,911);select * into k from public.robot_build_kits where id=p_kit for update;select * into t from public.project_tasks where id=k.task_id;
 if k.id is null or not exists(select 1 from public.team_members where id=auth.uid() and active)
 or not exists(select 1 from public.team_projects where id=t.project_id and public.has_permission('assign_team_work',subteam) and status not in ('completed','archived')) then raise exception 'Active project leader required';end if;
 select * into l from public.robot_build_assembly_lots where id=p_request;
 if l.id is not null then
 if l.kit_id=p_kit and l.task_id=p_task and l.quantity=p_quantity and l.created_by=auth.uid() and l.note=trim(p_note) then return l.id;end if;raise exception 'Request identity already used';end if;
 if p_request is null or p_quantity is null or p_quantity<=0 or length(trim(coalesce(p_note,''))) not between 3 and 2000 then raise exception 'Enter a whole inspection-lot quantity and identity';end if;
 if k.stock_output_part_id is null or t.archived or exists(select 1 from public.robot_build_batches where assembly_kit_id=k.id and assembly_lot_id is null) then raise exception 'Choose a stock assembly not already received as a whole';end if;
 if p_task=k.task_id or not exists(select 1 from public.project_tasks q join public.project_review_gates g on g.task_id=q.id where q.id=p_task and q.project_id=t.project_id and not q.archived and q.status<>'done' and g.enabled and g.decision_type='qc_accepted' and g.current_submission is null)
 or exists(select 1 from public.robot_build_jobs where task_id=p_task) or exists(select 1 from public.robot_build_lots where task_id=p_task) or exists(select 1 from public.robot_build_kits where task_id=p_task)
 then raise exception 'Choose a separate unsubmitted physical QC task for this lot';end if;
 select coalesce(sum(quantity),0) into claimed from public.robot_build_assembly_lots where kit_id=k.id;
 if claimed+p_quantity>k.stock_output_quantity then raise exception 'Inspection lots exceed planned assembly output';end if;
 insert into public.robot_build_assembly_lots(id,kit_id,task_id,quantity,created_by,note)values(p_request,p_kit,p_task,p_quantity,auth.uid(),trim(p_note));return p_request;
end$$;
create or replace function public.receive_robot_stock_assembly_lot(p_lot uuid,p_configuration uuid,p_note text,p_request uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare l public.robot_build_assembly_lots%rowtype;k public.robot_build_kits%rowtype;t public.project_tasks%rowtype;c public.project_robot_configurations%rowtype;s public.project_review_submissions%rowtype;b public.robot_build_batches%rowtype;
begin
 perform pg_advisory_xact_lock(6740,911);select * into l from public.robot_build_assembly_lots where id=p_lot for update;select * into k from public.robot_build_kits where id=l.kit_id for update;select * into t from public.project_tasks where id=k.task_id;
 if k.id is null or not exists(select 1 from public.team_members where id=auth.uid() and active)
 or not exists(select 1 from public.team_projects where id=t.project_id and public.has_permission('assign_team_work',subteam) and public.has_permission('manage_inventory',subteam)) then raise exception 'Project and inventory manager required';end if;
 select * into b from public.robot_build_batches where id=p_request;
 if b.id is not null then
  if b.assembly_lot_id=p_lot and k.configuration_id=p_configuration and b.actor_id=auth.uid() and b.note=trim(p_note) then return b.id;end if;
  raise exception 'Request identity already used with different values';end if;
 if k.stock_output_part_id is null or l.received_at is not null or k.installed_at is not null or (k.retired_at is not null and k.stock_received_at is null) then raise exception 'Choose an unreceived stock assembly';end if;
 if k.configuration_id is not null and k.configuration_id is distinct from p_configuration then raise exception 'Partial lots must use the same recorded assembly configuration';end if;
 if p_request is null or length(trim(coalesce(p_note,''))) not between 3 and 2000 then raise exception 'Record output identity and storage location';end if;
 select * into c from public.project_robot_configurations where id=p_configuration and project_id=t.project_id and configuration_kind='as_built';
 select sub.* into s from public.project_review_gates g join public.project_review_submissions sub on sub.id=g.current_submission where g.task_id=l.task_id and g.enabled and g.decision_type='qc_accepted' and public.robot_build_review_usable(l.task_id);
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
 insert into public.robot_build_batches(id,source_task_id,project_id,part_id,quantity,qc_submission_id,origin,assembly_kit_id,assembly_lot_id,actor_id,note)
 values(p_request,l.task_id,t.project_id,k.stock_output_part_id,l.quantity,s.id,'stock_assembly',k.id,l.id,auth.uid(),trim(p_note));
 update public.frc_parts_inventory set quantity=quantity+l.quantity,updated_at=now() where id=k.stock_output_part_id;
 insert into public.frc_stock_movements(part_id,quantity_delta,reason,note,member_id)values(k.stock_output_part_id,l.quantity,'received','Stock assembly '||k.id||': '||trim(p_note),auth.uid());
 update public.robot_build_kits set configuration_id=c.id,stock_received_at=now(),retired_at=now(),retirement_note='Consumed into accepted stock assembly '||p_request where id=k.id;
 insert into public.robot_build_kit_events(id,kit_id,action,quantity,actor_id,note)values(p_request,k.id,'stock_received',l.quantity,auth.uid(),trim(p_note));
 update public.robot_build_assembly_lots set received_at=now(),batch_id=p_request where id=l.id;
 return p_request;
end$$;

create or replace function public.guard_robot_assembly_receipt()returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if new.assembly_kit_id is not null and new.assembly_lot_id is null and exists(select 1 from public.robot_build_assembly_lots where kit_id=new.assembly_kit_id) then raise exception 'Receive the separately inspected lots; whole receipt would duplicate planned output';end if;
 return new;
end$$;
drop trigger if exists guard_robot_assembly_receipt on public.robot_build_batches;
create trigger guard_robot_assembly_receipt before insert on public.robot_build_batches for each row execute function public.guard_robot_assembly_receipt();
revoke all on function public.guard_robot_assembly_receipt() from public,anon,authenticated;
revoke all on function public.plan_robot_stock_assembly_lot(uuid,uuid,integer,text,uuid),public.receive_robot_stock_assembly_lot(uuid,uuid,text,uuid) from public,anon;
grant execute on function public.plan_robot_stock_assembly_lot(uuid,uuid,integer,text,uuid),public.receive_robot_stock_assembly_lot(uuid,uuid,text,uuid) to authenticated;
commit;
