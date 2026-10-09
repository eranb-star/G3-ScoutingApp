begin;
create or replace function public.link_robot_build_purchase(p_line uuid,p_purchase uuid,p_request uuid)returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare l public.robot_build_bom_lines%rowtype;b public.robot_build_boms%rowtype;q public.frc_purchase_requests%rowtype;x public.robot_build_purchases%rowtype;allocated numeric;pending numeric;amount integer;
begin
 perform pg_advisory_xact_lock(6740,911);
 select * into l from public.robot_build_bom_lines where id=p_line for update;select * into b from public.robot_build_boms where id=l.bom_id;
 select * into q from public.frc_purchase_requests where id=p_purchase for update;
 if l.id is null or q.id is null or b.shared_at is null or l.disposition<>'buy' or l.inventory_id is distinct from q.part_id
 or not exists(select 1 from public.team_members where id=auth.uid() and active)
 or not coalesce(public.has_permission('submit_purchase_requests'),false)
 or not (q.requested_by=auth.uid() or coalesce(public.is_admin(),false))
 or not exists(select 1 from public.team_projects where id=b.project_id and status not in ('completed','archived') and public.has_permission('assign_team_work',subteam))
 then raise exception 'Choose your existing request for this reviewed component, or ask an admin to link it';end if;
 select * into x from public.robot_build_purchases where purchase_id=q.id;
 if x.line_id=l.id then return q.id;elsif x.line_id is not null then raise exception 'This request already belongs to another build requirement';end if;
 if p_request is null or q.status not in ('requested','approved','ordered') or q.source_purchase_id is not null
 or exists(select 1 from public.frc_purchase_requests where source_purchase_id=q.id)
 then raise exception 'Link an open original request without partial-order children; reconcile received parts in stock';end if;
 amount:=case when q.status='requested' then q.quantity else coalesce(q.approved_quantity,q.quantity)+coalesce(q.deferred_quantity,0) end;
 select coalesce(sum(reserved+issued),0) into allocated from public.robot_build_allocations where line_id=l.id;
 with recursive chain as (
 select r.* from public.robot_build_purchases z join public.frc_purchase_requests r on r.id=z.purchase_id where z.line_id=l.id
 union select c.* from public.frc_purchase_requests c join chain p on c.source_purchase_id=p.id
 )select coalesce(sum(case when status='requested' then quantity when status in ('approved','ordered') then coalesce(approved_quantity,quantity)+coalesce(deferred_quantity,0) else 0 end),0)into pending from chain;
 if amount<=0 or amount>l.required_quantity-allocated-pending then raise exception 'Existing request exceeds unallocated demand; reconcile quantities before linking';end if;
 insert into public.robot_build_purchases(request_id,line_id,purchase_id,actor_id,quantity)values(p_request,l.id,q.id,auth.uid(),amount);
 insert into public.robot_build_bom_audit(bom_id,actor_id,action,detail)values(b.id,auth.uid(),'existing_purchase_linked',jsonb_build_object('line',l.id,'purchase',q.id,'quantity',amount));
 return q.id;
end$$;
revoke all on function public.link_robot_build_purchase(uuid,uuid,uuid) from public,anon;
grant execute on function public.link_robot_build_purchase(uuid,uuid,uuid) to authenticated;
commit;
