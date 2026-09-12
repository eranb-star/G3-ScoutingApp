-- Apply after the existing purchase/receiving and approval-aging migrations.
begin;
alter table public.frc_purchase_requests add column if not exists approved_quantity numeric(12,2);
alter table public.frc_purchase_requests add column if not exists deferred_quantity numeric(12,2) not null default 0;
alter table public.frc_purchase_requests add column if not exists declined_quantity numeric(12,2) not null default 0;
alter table public.frc_purchase_requests add column if not exists approval_note text;
alter table public.frc_purchase_requests add column if not exists source_purchase_id uuid references public.frc_purchase_requests(id) on delete restrict;
create unique index if not exists purchase_one_remainder_request on public.frc_purchase_requests(source_purchase_id) where source_purchase_id is not null;

create or replace function public.guard_purchase_quantity() returns trigger language plpgsql set search_path=public as $$
begin
 if TG_OP='INSERT' then
  if new.status<>'requested' or new.approved_quantity is not null or new.deferred_quantity<>0 or new.declined_quantity<>0 or new.approval_note is not null then raise exception 'New purchases must start as unapproved requests';end if;
  if new.source_purchase_id is not null and current_user in ('authenticated','anon') then raise exception 'Use Request remaining quantity';end if;
 else
  if new.status is distinct from old.status and current_user in ('authenticated','anon') then raise exception 'Use the purchase decision or receiving action';end if;
  if new.status='received' and old.status<>'received' and new.actual_quantity is null then raise exception 'Use Receive and record to record the received quantity';end if;
  if new.quantity is distinct from old.quantity or new.source_purchase_id is distinct from old.source_purchase_id then raise exception 'Original requested quantity and source are retained for audit';end if;
  if (new.approved_quantity,new.deferred_quantity,new.declined_quantity,new.approval_note) is distinct from (old.approved_quantity,old.deferred_quantity,old.declined_quantity,old.approval_note)
   and (current_user in ('authenticated','anon') or old.status<>'requested') then raise exception 'Use the quantity approval action';end if;
  if old.status='requested' and new.status='approved' and new.approved_quantity is null then new.approved_quantity:=new.quantity;end if;
  if new.actual_quantity is distinct from old.actual_quantity and new.approved_quantity is not null and new.actual_quantity>new.approved_quantity then raise exception 'Received quantity exceeds the approved quantity';end if;
 end if;
 if new.approved_quantity is not null and (new.approved_quantity<=0 or new.approved_quantity>new.quantity or new.deferred_quantity<0 or new.declined_quantity<0 or new.approved_quantity+new.deferred_quantity+new.declined_quantity<>new.quantity) then raise exception 'Approved and remaining quantities must equal the original request';end if;
 return new;
end $$;
drop trigger if exists purchase_quantity_guard on public.frc_purchase_requests;
create trigger purchase_quantity_guard before insert or update on public.frc_purchase_requests for each row execute function public.guard_purchase_quantity();

create or replace function public.approve_purchase_quantity(p_purchase uuid,p_quantity numeric,p_remainder text default 'deferred',p_note text default null)
returns public.frc_purchase_requests language plpgsql security definer set search_path=public as $$
declare r public.frc_purchase_requests; decision text;
begin
 if not coalesce(public.is_admin(),false) then raise exception 'Only administrators may approve purchases';end if;
 select * into r from public.frc_purchase_requests where id=p_purchase for update;
 if not found or r.status<>'requested' then raise exception 'Only pending requests can be approved';end if;
 if p_quantity is null or p_quantity<=0 or p_quantity>r.quantity or p_quantity<>round(p_quantity,2) then raise exception 'Enter a valid approved quantity up to the requested quantity';end if;
 if p_remainder is null or p_remainder not in ('deferred','declined') then raise exception 'Choose how to handle the remainder';end if;
 if p_quantity<r.quantity and length(trim(coalesce(p_note,'')))<3 then raise exception 'Explain the reduced quantity';end if;
 decision:='Requested '||r.quantity||'; approved '||p_quantity||'; '||p_remainder||' '||(r.quantity-p_quantity)||'. '||coalesce(trim(p_note),'');
 update public.frc_purchase_requests set approved_quantity=p_quantity,deferred_quantity=case when p_remainder='deferred' then quantity-p_quantity else 0 end,declined_quantity=case when p_remainder='declined' then quantity-p_quantity else 0 end,approval_note=decision where id=p_purchase;
 select * into r from public.transition_purchase_request(p_purchase,'approved',decision);
 return r;
end $$;

create or replace function public.request_purchase_remainder(p_purchase uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare r public.frc_purchase_requests; child uuid;
begin
 if auth.uid() is null then raise exception 'Sign in first';end if;
 select * into r from public.frc_purchase_requests where id=p_purchase for update;
 if not found or not (coalesce(public.is_admin(),false) or (r.requested_by=auth.uid() and coalesce(public.has_permission('submit_purchase_requests'),false))) then raise exception 'Not authorized to request this remainder';end if;
 if r.deferred_quantity<=0 or r.status not in ('approved','ordered','received') then raise exception 'No deferred quantity available';end if;
 select id into child from public.frc_purchase_requests where source_purchase_id=r.id;
 if child is not null then return child;end if;
 insert into public.frc_purchase_requests(part_id,item_name,quantity,estimated_cost,supplier,product_url,urgency,reason,requested_by,source_purchase_id)
 values(r.part_id,r.item_name,r.deferred_quantity,null,r.supplier,r.product_url,r.urgency,'Deferred remainder of '||r.id||'. Original decision: '||coalesce(r.approval_note,''),r.requested_by,r.id) returning id into child;
 return child;
end $$;
revoke all on function public.approve_purchase_quantity(uuid,numeric,text,text),public.request_purchase_remainder(uuid) from public,anon;
grant execute on function public.approve_purchase_quantity(uuid,numeric,text,text),public.request_purchase_remainder(uuid) to authenticated;

-- Keep the existing aged list for older APKs; add all-pending totals and rows.
create or replace function public.purchase_approval_aging() returns jsonb language sql stable security invoker set search_path=public as $$
 select case when public.is_admin() then jsonb_build_object('threshold_hours',s.threshold_hours,
 'pending_count',(select count(*) from public.frc_purchase_requests where status='requested'),
 'overdue_count',(select count(*) from public.frc_purchase_requests where status='requested' and created_at<=now()-make_interval(hours=>s.threshold_hours)),
 'pending_requests',coalesce((select jsonb_agg(to_jsonb(x) order by created_at,id) from (select id,item_name,created_at,floor(extract(epoch from (now()-created_at))/3600)::integer waiting_hours from public.frc_purchase_requests where status='requested' order by created_at,id limit 100) x),'[]'::jsonb),
 'requests',coalesce((select jsonb_agg(to_jsonb(x) order by created_at,id) from (select id,item_name,created_at,floor(extract(epoch from (now()-created_at))/3600)::integer waiting_hours from public.frc_purchase_requests where status='requested' and created_at<=now()-make_interval(hours=>s.threshold_hours) order by created_at,id limit 100) x),'[]'::jsonb)) else null end from public.purchase_approval_settings s where s.id;
$$;
create or replace function public.purchase_product_history()
returns table(id uuid,part_id uuid,item_name text,quantity numeric,supplier text,product_url text,status text,created_at timestamptz,category text,part_number text)
language sql stable security definer set search_path=public as $$
 select p.id,coalesce(p.received_part_id,p.part_id),p.item_name,coalesce(p.actual_quantity,p.approved_quantity,p.quantity)::numeric,p.supplier,p.product_url,p.status,p.created_at,i.category,i.part_number
 from public.frc_purchase_requests p left join public.frc_parts_inventory i on i.id=coalesce(p.received_part_id,p.part_id)
 where p.status='received' and exists(select 1 from public.team_members m where m.id=auth.uid() and m.active) and public.has_permission('submit_purchase_requests') order by p.created_at desc;
$$;
revoke all on function public.purchase_product_history() from public,anon;
grant execute on function public.purchase_product_history() to authenticated;

create or replace function public.assign_project_task_owner(p_task uuid,p_owner uuid) returns void language plpgsql security definer set search_path=public as $$
declare task public.project_tasks; team text;
begin
 select * into task from public.project_tasks where id=p_task for update;
 if not found or task.archived then raise exception 'Active task not found';end if;
 select subteam into team from public.team_projects where id=task.project_id and status not in ('archived','completed');
 if not found or not coalesce(public.has_permission('assign_team_work',team),false) or not exists(select 1 from public.team_members where id=auth.uid() and active) then raise exception 'Not authorized to assign this task';end if;
 if not exists(select 1 from public.team_members where id=p_owner and active) then raise exception 'Choose an active task owner';end if;
 update public.project_tasks set assignee_id=p_owner,updated_at=now() where id=p_task;
end $$;
revoke all on function public.assign_project_task_owner(uuid,uuid) from public,anon;
grant execute on function public.assign_project_task_owner(uuid,uuid) to authenticated;

create or replace function public.planned_mentor_reviews() returns jsonb language sql stable security invoker set search_path=public as $$
 select coalesce(jsonb_agg(j.value order by t.due_at nulls last),'[]'::jsonb)
 from jsonb_array_elements(public.project_review_context(null,true)) j(value)
 join public.project_tasks t on t.id=(j.value->>'task_id')::uuid
 join public.team_projects p on p.id=t.project_id
 where (j.value->>'reviewer_id')::uuid=auth.uid() and j.value->>'submission' is null
 and not t.archived and t.status<>'done' and p.status not in ('archived','completed');
$$;
revoke all on function public.planned_mentor_reviews() from public,anon;
grant execute on function public.planned_mentor_reviews() to authenticated;
commit;
