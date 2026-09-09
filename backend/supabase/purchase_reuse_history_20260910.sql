-- Product-only history; does not widen purchase or finance table RLS.
begin;
create or replace function public.purchase_product_history()
returns table(id uuid,part_id uuid,item_name text,quantity numeric,supplier text,product_url text,status text,created_at timestamptz,category text,part_number text)
language sql stable security definer set search_path=public as $$
  select p.id,p.part_id,p.item_name,p.quantity::numeric,p.supplier,p.product_url,p.status,p.created_at,i.category,i.part_number
  from public.frc_purchase_requests p
  left join public.frc_parts_inventory i on i.id=p.part_id
  where p.status='received'
    and exists(select 1 from public.team_members m where m.id=auth.uid() and m.active)
    and public.has_permission('submit_purchase_requests')
  order by p.created_at desc;
$$;
revoke all on function public.purchase_product_history() from public,anon;
grant execute on function public.purchase_product_history() to authenticated;
commit;
