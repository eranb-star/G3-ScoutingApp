begin;
-- Preserve the gross invoice/payment trail once actual supplier refunds refer to it.
create function public.guard_refunded_bill() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if tg_table_name='finance_supplier_bills' then
  if (new.amount,new.kind,new.currency) is distinct from (old.amount,old.kind,old.currency) and exists(select 1 from public.finance_bill_payments p join public.finance_expense_refunds r on r.expense_id=p.expense_id where p.bill_id=old.id group by p.expense_id having sum(r.amount)<>0) then raise exception 'This document has supplier refunds. Preserve its gross amount; use the refund ledger for credits.';end if;
 else
  if exists(select 1 from public.finance_expense_refunds where expense_id=old.expense_id having coalesce(sum(amount),0)<>0) then raise exception 'Payment has refund history. Reverse incorrect refunds before changing document payment links.';end if;
 end if;
 if tg_op='DELETE' then return old;end if;return new;
end$$;
create trigger refunded_bill_guard before update on public.finance_supplier_bills for each row execute function public.guard_refunded_bill();
create trigger refunded_bill_payment_guard before delete or update on public.finance_bill_payments for each row execute function public.guard_refunded_bill();
create function public.guard_refund_recovery_income() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if exists(select 1 from public.finance_refund_recoveries where income_id=old.id) then raise exception 'This income is an audited member credit recovery and cannot be edited independently';end if;
 if tg_op='DELETE' then return old;end if;return new;
end$$;
create trigger refund_recovery_income_guard before update or delete on public.finance_income for each row execute function public.guard_refund_recovery_income();
commit;
