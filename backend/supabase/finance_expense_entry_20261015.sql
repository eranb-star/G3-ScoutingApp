begin;
alter table public.finance_expenses add column invoice_reference text, add column invoice_override_reason text, add column entry_payload jsonb;
create unique index finance_invoice_identity on public.finance_expenses(lower(trim(vendor)),lower(trim(invoice_reference)),currency)
 where invoice_reference is not null and trim(invoice_reference)<>'' and vendor is not null and duplicate_of is null and invoice_override_reason is null;
create function public.record_finance_expense(p_request uuid,p_values jsonb) returns uuid language plpgsql security definer set search_path=public as $$
declare e public.finance_expenses; amount numeric; paid uuid; source text; occurred date; invoice text; override_reason text;
begin
 if not coalesce(public.is_admin(),false) or not exists(select 1 from public.team_members where id=auth.uid() and active) then raise exception 'Active administrator required';end if;
 if p_request is null or p_values is null or jsonb_typeof(p_values)<>'object' then raise exception 'Expense details required';end if;
 perform pg_advisory_xact_lock(6740,916);
 select * into e from public.finance_expenses where id=p_request;
 if found then if e.entry_payload is distinct from p_values then raise exception 'Request ID already used for different expense values';end if;return e.id;end if;
 amount:=(p_values->>'amount')::numeric;source:=p_values->>'payment_source';occurred:=(p_values->>'expense_date')::date;
 paid:=nullif(p_values->>'paid_by','')::uuid;invoice:=nullif(trim(p_values->>'invoice_reference'),'');override_reason:=nullif(trim(p_values->>'invoice_override_reason'),'');
 if amount is null or amount::text in ('NaN','Infinity','-Infinity') or amount<0 or amount<>round(amount,2) or source is null or source not in ('personal','team_account','cash','other') or occurred is null or occurred>(now() at time zone 'Asia/Jerusalem')::date or length(trim(coalesce(p_values->>'description','')))<3 or length(trim(coalesce(p_values->>'category','')))=0 or coalesce(p_values->>'currency','')!~'^[A-Z]{3}$' then raise exception 'Enter a valid amount, currency, date, category, description and payment source';end if;
 if source='personal' and not exists(select 1 from public.team_members where id=paid) then raise exception 'Select the person who paid';end if;
 if source<>'personal' then paid:=null;end if;
 if invoice is not null and length(trim(coalesce(p_values->>'vendor','')))=0 then raise exception 'Supplier is required with an invoice reference';end if;
 if override_reason is not null and length(override_reason)<8 then raise exception 'Explain why this invoice legitimately has another expense';end if;
 if invoice is not null and override_reason is null and exists(select 1 from public.finance_expenses where lower(trim(vendor))=lower(trim(p_values->>'vendor')) and lower(trim(invoice_reference))=lower(invoice) and currency=p_values->>'currency' and duplicate_of is null) then raise exception 'Invoice already recorded for this supplier and currency. Review the existing expense, or explain a legitimate split before saving.';end if;
 insert into public.finance_expenses(id,expense_date,category,vendor,description,amount,currency,paid_by,payment_source,reimbursement_status,notes,invoice_reference,invoice_override_reason,entry_payload)
 values(p_request,occurred,trim(p_values->>'category'),nullif(trim(p_values->>'vendor'),''),trim(p_values->>'description'),amount,p_values->>'currency',paid,source,case when source='personal' and amount>0 then 'owed' else 'not_required' end,nullif(trim(p_values->>'notes'),''),invoice,override_reason,p_values);
 return p_request;
end$$;
revoke all on function public.record_finance_expense(uuid,jsonb) from public,anon;
grant execute on function public.record_finance_expense(uuid,jsonb) to authenticated;
commit;
