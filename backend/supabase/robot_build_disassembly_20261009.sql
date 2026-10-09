begin;
alter table public.robot_build_batches add column if not exists retired_quantity integer not null default 0;
do $$begin
 if not exists(select 1 from pg_constraint where conrelid='public.robot_build_batches'::regclass and conname='build_batch_retired_limit') then
 alter table public.robot_build_batches add constraint build_batch_retired_limit check(retired_quantity>=0 and retired_quantity<=quantity);end if;
end$$;
alter table public.robot_build_batches drop constraint if exists robot_build_batches_origin_check;
alter table public.robot_build_batches add constraint robot_build_batches_origin_check check(origin in ('manufactured','existing_stock','stock_assembly','recovered'));
create table if not exists public.robot_build_disassemblies(
 id uuid primary key,batch_id uuid not null references public.robot_build_batches(id),quantity integer not null check(quantity>0),
 expected_retired integer not null,actor_id uuid not null references public.team_members(id),note text not null,created_at timestamptz not null default now()
);
create table if not exists public.robot_build_recoveries(
 id uuid primary key,disassembly_id uuid not null references public.robot_build_disassemblies(id),
 source_batch_id uuid not null references public.robot_build_batches(id),quantity integer not null check(quantity>0),
 inspection_task_id uuid not null references public.project_tasks(id),configuration_id uuid not null references public.project_robot_configurations(id),
 actor_id uuid not null references public.team_members(id),note text not null,created_at timestamptz not null default now(),unique(inspection_task_id)
);
alter table public.robot_build_disassemblies enable row level security;alter table public.robot_build_recoveries enable row level security;
revoke all on public.robot_build_disassemblies,public.robot_build_recoveries from public,anon,authenticated;
grant select on public.robot_build_disassemblies,public.robot_build_recoveries to authenticated;
drop policy if exists build_disassembly_read on public.robot_build_disassemblies;
create policy build_disassembly_read on public.robot_build_disassemblies for select to authenticated using(exists(select 1 from public.robot_build_batches where id=batch_id));
drop policy if exists build_recovery_read on public.robot_build_recoveries;
create policy build_recovery_read on public.robot_build_recoveries for select to authenticated using(exists(select 1 from public.robot_build_disassemblies where id=disassembly_id));

create or replace function public.disassemble_robot_stock(p_batch uuid,p_quantity integer,p_expected integer,p_note text,p_request uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare b public.robot_build_batches%rowtype;k public.robot_build_kits%rowtype;e public.robot_build_disassemblies%rowtype;used integer;physical numeric;
begin
 perform pg_advisory_xact_lock(6740,911);
 select * into b from public.robot_build_batches where id=p_batch for update;
 if b.id is null or not exists(select 1 from public.team_members where id=auth.uid() and active)
 or not exists(select 1 from public.team_projects where id=b.project_id and public.has_permission('assign_team_work',subteam) and public.has_permission('manage_inventory',subteam) and status not in ('archived','completed')) then raise exception 'Active project and inventory manager required';end if;
 select * into e from public.robot_build_disassemblies where id=p_request;
 if e.id is not null then
 if e.batch_id=p_batch and e.quantity=p_quantity and e.expected_retired=p_expected and e.actor_id=auth.uid() and e.note=trim(p_note) then return;end if;
 raise exception 'Request identity already used';end if;
 if p_request is null or p_quantity is null or p_quantity<=0 or p_expected is null or b.retired_quantity<>p_expected or length(trim(coalesce(p_note,''))) not between 3 and 2000 then raise exception 'Enter current batch, whole quantity and disassembly evidence';end if;
 select * into k from public.robot_build_kits where id=b.assembly_kit_id and stock_received_at is not null;
 if b.origin<>'stock_assembly' or k.id is null then raise exception 'Choose a received stock assembly with recorded components';end if;
 select coalesce(sum(quantity),0)into used from public.robot_build_kit_items where batch_id=b.id;
 if p_quantity>b.quantity-b.retired_quantity-used then raise exception 'Not enough unissued assemblies; installed or allocated assemblies cannot be dismantled here';end if;
 if exists(select 1 from public.robot_build_kit_items where kit_id=k.id and (quantity::bigint*p_quantity)%k.stock_output_quantity<>0) then raise exception 'Recorded component counts do not divide into this quantity; dismantle a complete recorded group';end if;
 select quantity into physical from public.frc_parts_inventory where id=b.part_id and unit='pcs' and not archived for update;
 if physical is null or physical-p_quantity<public.robot_build_reserved(b.part_id) then raise exception 'Not enough unreserved physical assemblies';end if;
 update public.robot_build_batches set retired_quantity=retired_quantity+p_quantity where id=b.id;
 update public.frc_parts_inventory set quantity=quantity-p_quantity,updated_at=now() where id=b.part_id;
 insert into public.frc_stock_movements(part_id,quantity_delta,reason,note,member_id)values(b.part_id,-p_quantity,'used','Disassembly '||p_request||': '||trim(p_note),auth.uid());
 insert into public.robot_build_disassemblies(id,batch_id,quantity,expected_retired,actor_id,note)values(p_request,p_batch,p_quantity,p_expected,auth.uid(),trim(p_note));
end$$;

create or replace function public.receive_robot_recovered_component(p_disassembly uuid,p_source_batch uuid,p_quantity integer,p_inspection uuid,p_configuration uuid,p_note text,p_request uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare d public.robot_build_disassemblies%rowtype;b public.robot_build_batches%rowtype;child public.robot_build_batches%rowtype;
 e public.robot_build_recoveries%rowtype;c public.project_robot_configurations%rowtype;s public.project_review_submissions%rowtype;maximum integer;recovered integer;
begin
 perform pg_advisory_xact_lock(6740,911);
 select * into d from public.robot_build_disassemblies where id=p_disassembly;
 select * into b from public.robot_build_batches where id=d.batch_id;
 if d.id is null or not exists(select 1 from public.team_members where id=auth.uid() and active)
 or not exists(select 1 from public.team_projects where id=b.project_id and public.has_permission('assign_team_work',subteam) and public.has_permission('manage_inventory',subteam) and status not in ('archived','completed')) then raise exception 'Active project and inventory manager required';end if;
 select * into e from public.robot_build_recoveries where id=p_request;
 if e.id is not null then
 if e.disassembly_id=p_disassembly and e.source_batch_id=p_source_batch and e.quantity=p_quantity and e.inspection_task_id=p_inspection and e.configuration_id=p_configuration and e.actor_id=auth.uid() and e.note=trim(p_note) then return e.id;end if;
 raise exception 'Request identity already used';end if;
 if p_request is null or p_quantity is null or p_quantity<=0 or length(trim(coalesce(p_note,''))) not between 3 and 2000 then raise exception 'Enter inspected quantity, component identity and location';end if;
 select * into child from public.robot_build_batches where id=p_source_batch;
 select (i.quantity::bigint*d.quantity/(select stock_output_quantity from public.robot_build_kits where id=b.assembly_kit_id))::integer into maximum from public.robot_build_kit_items i where kit_id=b.assembly_kit_id and batch_id=p_source_batch;
 select coalesce(sum(quantity),0)into recovered from public.robot_build_recoveries where disassembly_id=d.id and source_batch_id=p_source_batch;
 if maximum is null or p_quantity>maximum-recovered then raise exception 'Recovery exceeds recorded dismantled components';end if;
 select * into c from public.project_robot_configurations where id=p_configuration and project_id=b.project_id and configuration_kind='as_built';
 select sub.* into s from public.project_review_gates g join public.project_tasks t on t.id=g.task_id join public.project_review_submissions sub on sub.id=g.current_submission
 where g.task_id=p_inspection and t.project_id=b.project_id and not t.archived and g.enabled and g.decision_type='qc_accepted' and public.robot_build_review_usable(g.task_id) and sub.submitted_at>=d.created_at;
 if c.id is null or s.id is null or s.revision<>c.revision or not exists(select 1 from jsonb_each(s.requirement_results) r where r.value->'configuration_snapshot'->>'id'=c.id::text)
 or exists(select 1 from jsonb_each(s.requirement_results) r where r.value->'configuration_snapshot'->>'id' is distinct from c.id::text)
 or exists(select 1 from public.robot_build_batches where source_task_id=p_inspection)
 then raise exception 'Use a new independent physical QC after disassembly for this exact recovered configuration';end if;
 perform 1 from public.frc_parts_inventory where id=child.part_id and unit='pcs' and not archived for update;
 if not found then raise exception 'Recovered component inventory item unavailable';end if;
 insert into public.robot_build_recoveries(id,disassembly_id,source_batch_id,quantity,inspection_task_id,configuration_id,actor_id,note)values(p_request,d.id,child.id,p_quantity,p_inspection,c.id,auth.uid(),trim(p_note));
 insert into public.robot_build_batches(id,source_task_id,project_id,part_id,quantity,qc_submission_id,origin,actor_id,note)values(p_request,p_inspection,b.project_id,child.part_id,p_quantity,s.id,'recovered',auth.uid(),trim(p_note));
 update public.frc_parts_inventory set quantity=quantity+p_quantity,updated_at=now() where id=child.part_id;
 insert into public.frc_stock_movements(part_id,quantity_delta,reason,note,member_id)values(child.part_id,p_quantity,'returned','Inspected recovery '||d.id||': '||trim(p_note),auth.uid());
 return p_request;
end$$;

-- Protect all issue paths, including older clients, without rewriting historical receipts.
create or replace function public.guard_robot_batch_retirement()returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare b public.robot_build_batches%rowtype;others integer;
begin
 perform pg_advisory_xact_lock(6740,911);select * into b from public.robot_build_batches where id=new.batch_id;
 select coalesce(sum(quantity),0)into others from public.robot_build_kit_items where batch_id=new.batch_id and kit_id<>new.kit_id;
 if new.quantity+others>b.quantity-b.retired_quantity then raise exception 'Batch quantity is issued or retired by disassembly';end if;
 return new;
end$$;
drop trigger if exists guard_robot_batch_retirement on public.robot_build_kit_items;
create trigger guard_robot_batch_retirement before insert or update on public.robot_build_kit_items for each row execute function public.guard_robot_batch_retirement();
-- Existing-stock adoption must count only remaining, unissued mapped stock.
do $$declare definition text;begin
 definition:=pg_get_functiondef('public.reconcile_robot_build_existing_stock(uuid,uuid,integer,text,uuid)'::regprocedure);
 definition:=replace(definition,'sum(x.quantity-coalesce(','sum(x.quantity-x.retired_quantity-coalesce(');
 execute definition;
end$$;
revoke all on function public.guard_robot_batch_retirement() from public,anon,authenticated;
revoke all on function public.disassemble_robot_stock(uuid,integer,integer,text,uuid),public.receive_robot_recovered_component(uuid,uuid,integer,uuid,uuid,text,uuid) from public,anon;
grant execute on function public.disassemble_robot_stock(uuid,integer,integer,text,uuid),public.receive_robot_recovered_component(uuid,uuid,integer,uuid,uuid,text,uuid) to authenticated;
commit;
