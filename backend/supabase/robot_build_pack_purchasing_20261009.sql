-- Pack specification is retained; purchasing and finance continue in pieces.
begin;
alter table public.robot_build_purchases add column if not exists units_per_pack integer not null default 1 check(units_per_pack>0);
create or replace function public.request_robot_build_pack_purchase(p_line uuid,p_packs integer,p_units_per_pack integer,p_request uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare p_quantity integer; l public.robot_build_bom_lines%rowtype;b public.robot_build_boms%rowtype;link public.robot_build_purchases%rowtype;result uuid;covered numeric;pending numeric;available numeric;printing numeric;inv public.frc_parts_inventory%rowtype;
begin
 if p_packs is null or p_units_per_pack is null or p_packs not between 1 and 100000 or p_units_per_pack not between 1 and 100000 or p_packs::bigint*p_units_per_pack>100000 then raise exception 'Enter whole packs and pieces per pack, up to 100000 pieces total';end if;
 p_quantity:=p_packs*p_units_per_pack;
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
  if link.actor_id=auth.uid() and link.line_id=p_line and link.quantity=p_quantity and link.units_per_pack=p_units_per_pack then return link.purchase_id;end if;
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
 if p_quantity is null or p_quantity<=0 or p_packs>ceil(greatest(0,l.required_quantity-covered-pending-available)/p_units_per_pack) then raise exception 'Quantity exceeds uncovered demand after available stock, linked requests and allocations';end if;
 insert into public.frc_purchase_requests(part_id,item_name,quantity,reason,requested_by)values(l.inventory_id,l.name,p_quantity,'Robot build requirement '||l.id||'. Pack specification: '||p_packs||' packs x '||p_units_per_pack||' pieces = '||p_quantity||' pieces. Approval and receipt quantities are PIECES; excess remains shared stock.',auth.uid())returning id into result;
 insert into public.robot_build_purchases(request_id,line_id,purchase_id,actor_id,quantity,units_per_pack)values(p_request,l.id,result,auth.uid(),p_quantity,p_units_per_pack);
 return result;
end$$;
revoke all on function public.request_robot_build_pack_purchase(uuid,integer,integer,uuid) from public,anon;
grant execute on function public.request_robot_build_pack_purchase(uuid,integer,integer,uuid) to authenticated;
commit;
