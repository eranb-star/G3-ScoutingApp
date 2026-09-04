begin;

alter table public.frc_purchase_requests
  add column if not exists product_url text;

update public.frc_purchase_requests
set reason='Reason not captured in the original request'
where reason is null or length(trim(reason)) < 3;

alter table public.frc_purchase_requests
  drop constraint if exists frc_purchase_requests_reason_required;
alter table public.frc_purchase_requests
  add constraint frc_purchase_requests_reason_required
  check (length(trim(reason)) >= 3);

alter table public.frc_purchase_requests
  drop constraint if exists frc_purchase_requests_product_url_valid;
alter table public.frc_purchase_requests
  add constraint frc_purchase_requests_product_url_valid
  check (product_url is null or product_url ~* '^https?://');

create or replace function public.notify_admins_of_purchase_request()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare requester_name text;
begin
  select display_name into requester_name from public.team_members where id=new.requested_by;
  insert into public.announcements(title,body,audience,priority,created_by)
  values(
    'New purchase request: '||new.item_name,
    coalesce(requester_name,'A team member')||' requested '||new.quantity||' × '||new.item_name||'. Reason: '||new.reason||
      case when new.product_url is null then '' else ' Product link: '||new.product_url end||
      ' Open Work → Team Operations → Tools & Inventory → Purchasing to review it.',
    'admins',
    case when new.urgency in ('high','critical') then 'important' else 'normal' end,
    new.requested_by
  );
  return new;
end$$;

drop trigger if exists purchase_request_admin_notification on public.frc_purchase_requests;
create trigger purchase_request_admin_notification
after insert on public.frc_purchase_requests
for each row execute function public.notify_admins_of_purchase_request();

commit;
