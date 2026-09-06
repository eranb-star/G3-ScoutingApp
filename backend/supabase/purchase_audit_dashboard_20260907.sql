-- G3 purchase governance: validated transitions, rejection reasons and a durable audit trail.
begin;

alter table public.frc_purchase_requests add column if not exists rejection_reason text;

create table if not exists public.frc_purchase_status_history(
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.frc_purchase_requests(id) on delete cascade,
  from_status text,
  to_status text not null,
  note text,
  changed_by uuid references public.team_members(id) on delete set null,
  changed_at timestamptz not null default now()
);
create index if not exists frc_purchase_history_request_idx on public.frc_purchase_status_history(purchase_id,changed_at desc);
alter table public.frc_purchase_status_history enable row level security;
drop policy if exists "members view purchase history" on public.frc_purchase_status_history;
create policy "members view purchase history" on public.frc_purchase_status_history for select to authenticated
using(exists(select 1 from public.frc_purchase_requests request where request.id=purchase_id));

create or replace function public.transition_purchase_request(p_purchase_id uuid,p_status text,p_note text default null)
returns public.frc_purchase_requests
language plpgsql security definer set search_path=public
as $$
declare request public.frc_purchase_requests; old_status text;
begin
  if not public.is_admin() then raise exception 'Only administrators can change purchase status'; end if;
  select * into request from public.frc_purchase_requests where id=p_purchase_id for update;
  if not found then raise exception 'Purchase request not found'; end if;
  old_status:=request.status;
  if not ((old_status='requested' and p_status in ('approved','rejected')) or (old_status='approved' and p_status='ordered') or (old_status='ordered' and p_status='received')) then
    raise exception 'Invalid purchase transition from % to %',old_status,p_status;
  end if;
  if p_status='rejected' and length(trim(coalesce(p_note,'')))<3 then raise exception 'A rejection reason is required'; end if;
  update public.frc_purchase_requests set
    status=p_status,
    rejection_reason=case when p_status='rejected' then trim(p_note) else rejection_reason end,
    reviewed_by=auth.uid(),reviewed_at=case when p_status in ('approved','rejected') then now() else reviewed_at end,
    ordered_at=case when p_status='ordered' then now() else ordered_at end,
    received_at=case when p_status='received' then now() else received_at end,
    updated_at=now()
  where id=p_purchase_id returning * into request;
  insert into public.frc_purchase_status_history(purchase_id,from_status,to_status,note,changed_by)
  values(p_purchase_id,old_status,p_status,nullif(trim(coalesce(p_note,'')),''),auth.uid());
  perform public.sync_team_action(
    'purchase_request_status',p_purchase_id,
    'Purchase request '||p_status||': '||request.item_name,
    case when p_status='rejected' then 'Reason: '||trim(p_note) else 'Your purchase request is now '||p_status||'.' end,
    'announcement','member',request.requested_by::text,null,
    case when p_status='rejected' then 'high' else 'normal' end,
    '/tools?tab=purchasing&purchase='||p_purchase_id,auth.uid(),false
  );
  return request;
end$$;
grant execute on function public.transition_purchase_request(uuid,text,text) to authenticated;

commit;
