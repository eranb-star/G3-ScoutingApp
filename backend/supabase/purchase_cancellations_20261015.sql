begin;
create table public.purchase_order_cancellations(
 id uuid primary key,order_id uuid not null references public.purchase_confirmed_orders(id),quantity numeric(12,2) not null check(quantity>0),amount numeric(12,2) not null check(amount>=0),
 effective_on date not null,reason text not null,actor_id uuid not null references public.team_members(id),created_at timestamptz not null default now(),request_payload jsonb not null,before_values jsonb not null,after_values jsonb not null
);
alter table public.purchase_order_cancellations enable row level security;
revoke all on public.purchase_order_cancellations from public,anon,authenticated;
grant select on public.purchase_order_cancellations to authenticated;
create policy cancellation_admin_read on public.purchase_order_cancellations for select to authenticated using(public.is_admin());
create function public.cancel_confirmed_order_scope(p_order uuid,p_revision integer,p_quantity numeric,p_amount numeric,p_date date,p_reason text,p_request uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare o public.purchase_confirmed_orders;after_order public.purchase_confirmed_orders;prior public.purchase_order_cancellations;received numeric;covered numeric;payload jsonb;
begin
 if not coalesce(public.is_admin(),false) or not exists(select 1 from public.team_members where id=auth.uid() and active) then raise exception 'Active administrator required';end if;
 if p_request is null or p_quantity is null or p_amount is null or p_quantity::text in ('NaN','Infinity','-Infinity') or p_amount::text in ('NaN','Infinity','-Infinity') or p_quantity<=0 or p_amount<0 or p_quantity<>round(p_quantity,2) or p_amount<>round(p_amount,2)
 or p_date is null or p_date>(now() at time zone 'Asia/Jerusalem')::date or length(trim(coalesce(p_reason,'')))<4 then raise exception 'Enter cancelled quantity, value, date and reason';end if;
 payload:=jsonb_build_object('order',p_order,'revision',p_revision,'quantity',p_quantity,'amount',p_amount,'date',p_date,'reason',trim(p_reason));
 perform pg_advisory_xact_lock(6740,916);
 select * into prior from public.purchase_order_cancellations where id=p_request;
 if found then if prior.request_payload<>payload then raise exception 'Request ID already used';end if;return prior.id;end if;
 select * into o from public.purchase_confirmed_orders where id=p_order for update;
 if not found or p_revision is null or o.revision<>p_revision then raise exception 'Order changed. Refresh before cancelling.';end if;
 select coalesce(sum(accepted_quantity),0) into received from public.purchase_deliveries where order_id=p_order;
 select coalesce(sum(amount),0) into covered from public.purchase_expense_allocations where order_id=p_order;
 if p_quantity>o.quantity-received-o.cancelled_quantity then raise exception 'Only undelivered, uncancelled quantity can be cancelled';end if;
 if p_amount>o.total-o.cancelled_amount-covered then raise exception 'Cancellation overlaps recorded expenses. Resolve the invoice or credit first; no payment will be silently removed.';end if;
 update public.purchase_confirmed_orders set cancelled_quantity=cancelled_quantity+p_quantity,cancelled_amount=cancelled_amount+p_amount,revision=revision+1 where id=p_order returning * into after_order;
 insert into public.purchase_order_cancellations values(p_request,p_order,p_quantity,p_amount,p_date,trim(p_reason),auth.uid(),now(),payload,to_jsonb(o),to_jsonb(after_order));
 insert into public.frc_purchase_status_history(purchase_id,from_status,to_status,note,changed_by)
 select id,status,status,'Cancelled undelivered scope: '||p_quantity||', '||o.currency||' '||p_amount||'. No stock, expense or payment changed. '||trim(p_reason),auth.uid() from public.frc_purchase_requests where id=o.purchase_id;
 return p_request;
end$$;
revoke all on function public.cancel_confirmed_order_scope(uuid,integer,numeric,numeric,date,text,uuid) from public,anon;
grant execute on function public.cancel_confirmed_order_scope(uuid,integer,numeric,numeric,date,text,uuid) to authenticated;
commit;
