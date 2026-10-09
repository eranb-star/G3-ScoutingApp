begin;
create table if not exists public.robot_build_allocations(
 line_id uuid primary key references public.robot_build_bom_lines(id) on delete restrict,
 part_id uuid not null references public.frc_parts_inventory(id) on delete restrict,
 reserved integer not null default 0 check(reserved>=0),issued integer not null default 0 check(issued>=0),revision integer not null default 1
);
create table if not exists public.robot_build_stock_events(
 id uuid primary key,line_id uuid not null references public.robot_build_bom_lines(id),actor_id uuid not null references public.team_members(id),
 action text not null,amount integer not null,expected_revision integer not null,note text not null,created_at timestamptz not null default now()
);
create table if not exists public.robot_build_purchases(
 request_id uuid primary key,line_id uuid not null references public.robot_build_bom_lines(id),purchase_id uuid not null unique references public.frc_purchase_requests(id),actor_id uuid not null references public.team_members(id),quantity integer not null
);
alter table public.robot_build_allocations enable row level security;
alter table public.robot_build_stock_events enable row level security;
alter table public.robot_build_purchases enable row level security;
revoke all on public.robot_build_allocations,public.robot_build_stock_events,public.robot_build_purchases from public,anon,authenticated;
grant select on public.robot_build_allocations,public.robot_build_stock_events,public.robot_build_purchases to authenticated;
drop policy if exists allocation_read on public.robot_build_allocations;
create policy allocation_read on public.robot_build_allocations for select to authenticated using(exists(select 1 from public.robot_build_bom_lines where id=line_id));
drop policy if exists stock_event_read on public.robot_build_stock_events;
create policy stock_event_read on public.robot_build_stock_events for select to authenticated using(exists(select 1 from public.robot_build_bom_lines where id=line_id));
drop policy if exists build_purchase_read on public.robot_build_purchases;
create policy build_purchase_read on public.robot_build_purchases for select to authenticated using(exists(select 1 from public.robot_build_bom_lines where id=line_id));

create or replace function public.robot_build_reserved(p_part uuid)returns numeric language sql stable security definer set search_path=public,pg_temp as $$
 select coalesce(sum(reserved),0) from public.robot_build_allocations where part_id=p_part;
$$;
revoke all on function public.robot_build_reserved(uuid) from public,anon,authenticated;

-- Both consumers share the inventory row lock and the same combined reservation floor.
create or replace function public.protect_print_reservations() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare reserved numeric;
begin
 select coalesce(sum((x->>'grams')::numeric*j.quantity/1000),0) into reserved from public.fundraising_jobs j cross join lateral jsonb_array_elements(j.snapshot->'materials') x where j.status='printing' and x->>'part_id'=new.id::text;
 if new.quantity<reserved+public.robot_build_reserved(new.id) then raise exception 'Stock is reserved for robot build or active print jobs';end if;
 return new;
end$$;
create or replace function public.guard_build_allocation_line()returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if (new.inventory_id is distinct from old.inventory_id or new.required_quantity is distinct from old.required_quantity or new.disposition is distinct from old.disposition)
 and exists(select 1 from public.robot_build_allocations where line_id=old.id and (reserved>0 or issued>0))
 then raise exception 'Return issued stock and release reservations before changing this requirement';end if;
 if (new.inventory_id is distinct from old.inventory_id or new.disposition is distinct from old.disposition or new.required_quantity is distinct from old.required_quantity)
 and exists(select 1 from public.robot_build_purchases where line_id=old.id)
 then raise exception 'This requirement has purchasing history. Preserve its part and quantity; use a new reviewed requirement for a changed design';end if;
 return new;
end$$;
drop trigger if exists guard_build_allocation_line on public.robot_build_bom_lines;
create trigger guard_build_allocation_line before update on public.robot_build_bom_lines for each row execute function public.guard_build_allocation_line();

create or replace function public.move_robot_build_stock(p_line uuid,p_action text,p_amount integer,p_expected integer,p_note text,p_request uuid)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare l public.robot_build_bom_lines%rowtype;b public.robot_build_boms%rowtype;a public.robot_build_allocations%rowtype;inv public.frc_parts_inventory%rowtype;e public.robot_build_stock_events%rowtype;printing numeric;delta integer;
begin
 perform pg_advisory_xact_lock(6740,911);
 select * into l from public.robot_build_bom_lines where id=p_line for update;
 select * into b from public.robot_build_boms where id=l.bom_id;
 if l.id is null or b.shared_at is null or not exists(select 1 from public.team_members where id=auth.uid() and active)
 or not exists(select 1 from public.team_projects where id=b.project_id and status not in ('archived','completed') and public.has_permission('assign_team_work',subteam) and public.has_permission('manage_inventory',subteam)) then raise exception 'Project and inventory management permissions are required';end if;
 if p_request is null then raise exception 'Request identity required';end if;
 select * into e from public.robot_build_stock_events where id=p_request;
 if e.id is not null then
  if e.line_id=p_line and e.actor_id=auth.uid() and e.action=p_action and e.amount=p_amount and e.expected_revision=p_expected and e.note=trim(p_note) then return p_expected+1;end if;
  raise exception 'Request identity was used with different values';end if;
 if p_action is null or p_action not in ('reserve','release','issue','return') or p_amount is null or p_amount<=0 or length(trim(coalesce(p_note,''))) not between 3 and 2000 then raise exception 'Choose a positive quantity and explain the stock action';end if;
 if l.disposition not in ('buy','reuse') or l.inventory_id is null then raise exception 'Review and match this purchased or reused component first';end if;
 select * into inv from public.frc_parts_inventory where id=l.inventory_id and not archived for update;
 if inv.id is null or inv.unit<>'pcs' then raise exception 'Active piece-counted component required';end if;
 insert into public.robot_build_allocations(line_id,part_id)values(l.id,inv.id)on conflict do nothing;
 select * into a from public.robot_build_allocations where line_id=l.id for update;
 if a.revision<>p_expected then raise exception 'Allocation changed. Reload before saving';end if;
 if a.part_id<>inv.id then
  if a.reserved<>0 or a.issued<>0 then raise exception 'Existing allocation uses a different component';end if;
  update public.robot_build_allocations set part_id=inv.id where line_id=l.id;
 end if;
 delta:=0;
 if p_action='reserve' then
  select coalesce(sum((x->>'grams')::numeric*j.quantity/1000),0)into printing from public.fundraising_jobs j cross join lateral jsonb_array_elements(j.snapshot->'materials') x where j.status='printing' and x->>'part_id'=inv.id::text;
  if a.reserved+a.issued+p_amount>l.required_quantity or inv.quantity-public.robot_build_reserved(inv.id)-printing<p_amount then raise exception 'Quantity exceeds uncovered demand or available stock';end if;
  update public.robot_build_allocations set reserved=reserved+p_amount where line_id=l.id;
 elsif p_action='release' then
  if a.reserved<p_amount then raise exception 'Release exceeds reserved quantity';end if;
  update public.robot_build_allocations set reserved=reserved-p_amount where line_id=l.id;
 elsif p_action='issue' then
  if a.reserved<p_amount then raise exception 'Reserve these parts before issuing them';end if;
  update public.robot_build_allocations set reserved=reserved-p_amount,issued=issued+p_amount where line_id=l.id;delta:=-p_amount;
 else
  if a.issued<p_amount then raise exception 'Return exceeds issued quantity';end if;
  update public.robot_build_allocations set issued=issued-p_amount where line_id=l.id;delta:=p_amount;
 end if;
 if delta<>0 then
  update public.frc_parts_inventory set quantity=quantity+delta,updated_at=now() where id=inv.id;
  insert into public.frc_stock_movements(part_id,quantity_delta,reason,note,member_id)values(inv.id,delta,case when delta>0 then 'returned' else 'used' end,'Robot build '||l.id||': '||trim(p_note),auth.uid());
 end if;
 update public.robot_build_allocations set revision=revision+1 where line_id=l.id;
 insert into public.robot_build_stock_events(id,line_id,actor_id,action,amount,expected_revision,note)values(p_request,l.id,auth.uid(),p_action,p_amount,p_expected,trim(p_note));
 return p_expected+1;
end$$;
revoke all on function public.move_robot_build_stock(uuid,text,integer,integer,text,uuid) from public,anon;
grant execute on function public.move_robot_build_stock(uuid,text,integer,integer,text,uuid) to authenticated;

create or replace function public.request_robot_build_purchase(p_line uuid,p_quantity integer,p_request uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare l public.robot_build_bom_lines%rowtype;b public.robot_build_boms%rowtype;link public.robot_build_purchases%rowtype;result uuid;covered numeric;pending numeric;available numeric;printing numeric;inv public.frc_parts_inventory%rowtype;
begin
 perform pg_advisory_xact_lock(6740,911);
 select * into l from public.robot_build_bom_lines where id=p_line for update;
 select * into b from public.robot_build_boms where id=l.bom_id;
 if l.id is null or b.shared_at is null or l.disposition<>'buy' or l.inventory_id is null
 or not exists(select 1 from public.team_members where id=auth.uid() and active)
 or not coalesce(public.has_permission('submit_purchase_requests'),false)
 or not exists(select 1 from public.team_projects where id=b.project_id and status not in ('completed','archived') and public.has_permission('assign_team_work',subteam))
 then raise exception 'A reviewed purchase line and authorized project requester are required';end if;
 if p_request is null then raise exception 'Request identity required';end if;
 select * into link from public.robot_build_purchases where request_id=p_request;
 if link.request_id is not null then
  if link.actor_id=auth.uid() and link.line_id=p_line and link.quantity=p_quantity then return link.purchase_id;end if;
  raise exception 'Request identity was used with different values';end if;
 select coalesce(sum(reserved+issued),0) into covered from public.robot_build_allocations where line_id=l.id;
 select * into inv from public.frc_parts_inventory where id=l.inventory_id and not archived for update;
 if inv.id is null or inv.unit<>'pcs' then raise exception 'Active piece-counted component required';end if;
 select coalesce(sum((x->>'grams')::numeric*j.quantity/1000),0)into printing from public.fundraising_jobs j cross join lateral jsonb_array_elements(j.snapshot->'materials') x where j.status='printing' and x->>'part_id'=inv.id::text;
 available:=greatest(0,inv.quantity-public.robot_build_reserved(inv.id)-printing);
 with recursive chain as (
  select q.* from public.robot_build_purchases x join public.frc_purchase_requests q on q.id=x.purchase_id where x.line_id=l.id
  union select child.* from public.frc_purchase_requests child join chain parent on child.source_purchase_id=parent.id
 ) select coalesce(sum(case when q.status='requested' then q.quantity
  when q.status in ('approved','ordered','received') then
   (case when q.status='received' then 0 else coalesce(q.approved_quantity,q.quantity) end)
   +case when not exists(select 1 from public.frc_purchase_requests child where child.source_purchase_id=q.id) then q.deferred_quantity else 0 end
  else 0 end),0)into pending from chain q;
 if p_quantity is null or p_quantity<=0 or p_quantity>l.required_quantity-covered-pending-available then raise exception 'Quantity exceeds uncovered demand after available stock, linked requests and allocations';end if;
 insert into public.frc_purchase_requests(part_id,item_name,quantity,reason,requested_by)values(l.inventory_id,l.name,p_quantity,'Robot build requirement '||l.id,auth.uid())returning id into result;
 insert into public.robot_build_purchases(request_id,line_id,purchase_id,actor_id,quantity)values(p_request,l.id,result,auth.uid(),p_quantity);
 return result;
end$$;
revoke all on function public.request_robot_build_purchase(uuid,integer,uuid) from public,anon;
grant execute on function public.request_robot_build_purchase(uuid,integer,uuid) to authenticated;
revoke all on function public.guard_build_allocation_line() from public,anon,authenticated;
create or replace function public.guard_print_build_reservations() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare material jsonb;inv public.frc_parts_inventory%rowtype;printing numeric;
begin
 if new.status<>'printing' then return new;end if;
 for material in select value from jsonb_array_elements(new.snapshot->'materials') order by value->>'part_id' loop
  select * into inv from public.frc_parts_inventory where id=(material->>'part_id')::uuid for update;
  select coalesce(sum((x->>'grams')::numeric*j.quantity/1000),0)into printing from public.fundraising_jobs j cross join lateral jsonb_array_elements(j.snapshot->'materials') x where j.status='printing' and x->>'part_id'=material->>'part_id';
  if inv.quantity<printing+public.robot_build_reserved(inv.id) then raise exception 'Stock is already reserved for robot build or printing';end if;
 end loop;
 return new;
end$$;
drop trigger if exists guard_print_build_reservations on public.fundraising_jobs;
create trigger guard_print_build_reservations after insert or update of status,snapshot,quantity on public.fundraising_jobs for each row execute function public.guard_print_build_reservations();
revoke all on function public.guard_print_build_reservations() from public,anon,authenticated;

-- A linked request remains the same component throughout its remainder chain.
-- Quantity and status edits still use the existing purchasing approval workflow.
create or replace function public.guard_robot_build_purchase_identity()returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare root_line uuid; matched uuid;
begin
 if tg_op='UPDATE' and new.source_purchase_id is distinct from old.source_purchase_id then
  if exists(with recursive ancestors as (
   select old.id id,old.source_purchase_id source_purchase_id
   union select q.id,q.source_purchase_id from public.frc_purchase_requests q join ancestors a on q.id=a.source_purchase_id
  )select 1 from ancestors a join public.robot_build_purchases x on x.purchase_id=a.id)
  then raise exception 'A Robot Build purchase cannot be detached from its requirement';end if;
 end if;
 with recursive ancestors as (
  select new.id id,new.source_purchase_id source_purchase_id
  union select q.id,q.source_purchase_id from public.frc_purchase_requests q join ancestors a on q.id=a.source_purchase_id
 )select l.id,l.inventory_id into root_line,matched from ancestors a join public.robot_build_purchases x on x.purchase_id=a.id join public.robot_build_bom_lines l on l.id=x.line_id limit 1;
 if root_line is not null and new.part_id is distinct from matched then
  raise exception 'This purchase is linked to a Robot Build component. Create a separate request for another component';
 end if;
 return new;
end$$;
drop trigger if exists guard_robot_build_purchase_identity on public.frc_purchase_requests;
create trigger guard_robot_build_purchase_identity before insert or update of part_id,source_purchase_id on public.frc_purchase_requests for each row execute function public.guard_robot_build_purchase_identity();
revoke all on function public.guard_robot_build_purchase_identity() from public,anon,authenticated;
commit;
