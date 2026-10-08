-- Scoped operational corrections. Apply after fundraising and purchase quantity releases.
begin;
insert into public.app_permissions(permission_key,permission_group,label,label_he,description,protected,sort_order)
values('manage_fundraising','Operations','Manage fundraising production','ניהול ייצור לגיוס כספים','Manage products, production and sales without direct inventory editing or Finance posting.',false,91)
on conflict(permission_key) do nothing;
insert into public.role_permissions(role,permission_key,allowed)
values('admin','manage_fundraising',true),('team_leader','manage_fundraising',true),('mentor','manage_fundraising',false),('member','manage_fundraising',false)
on conflict(role,permission_key) do nothing;
create or replace function public.fundraising_allowed() returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.team_members where id=auth.uid() and active)
 and (coalesce(public.has_permission('manage_fundraising'),false) or coalesce(public.has_permission('manage_inventory'),false))
$$;
-- Preserve the deployed command implementation; change only the permission error.
do $$declare definition text;begin
 select pg_get_functiondef('public.fundraising_command(text,jsonb)'::regprocedure) into definition;
 execute replace(definition,'Inventory management permission required','Fundraising management permission required');
end$$;

alter table public.frc_purchase_requests add column if not exists revision integer not null default 1;
alter table public.frc_purchase_status_history add column if not exists before_values jsonb;
alter table public.frc_purchase_status_history add column if not exists after_values jsonb;
create or replace function public.bump_purchase_revision() returns trigger language plpgsql set search_path=public as $$
begin new.revision:=old.revision+1;return new;end$$;
drop trigger if exists purchase_revision on public.frc_purchase_requests;
create trigger purchase_revision before update on public.frc_purchase_requests for each row execute function public.bump_purchase_revision();

-- Existing guard still protects approvals/receiving. Permit quantity corrections only
-- inside an authorized definer call while BOTH old and new states are requested.
do $$declare definition text;begin
 select pg_get_functiondef('public.guard_purchase_quantity()'::regprocedure) into definition;
 definition:=replace(definition,'if new.quantity is distinct from old.quantity or new.source_purchase_id is distinct from old.source_purchase_id then',
 'if (new.quantity is distinct from old.quantity and not (current_user not in (''authenticated'',''anon'') and old.status=''requested'' and new.status=''requested'')) or new.source_purchase_id is distinct from old.source_purchase_id then');
 execute definition;
end$$;

create or replace function public.correct_purchase_request(p_purchase uuid,p_revision integer,p_cancel boolean,p_values jsonb default '{}')
returns public.frc_purchase_requests language plpgsql security definer set search_path=public as $$
declare r public.frc_purchase_requests; previous jsonb; item text; linked uuid;
begin
 if not exists(select 1 from public.team_members where id=auth.uid() and active) then raise exception 'Not authorized';end if;
 select * into r from public.frc_purchase_requests where id=p_purchase for update;
 if not found or not (coalesce(public.is_admin(),false) or (r.requested_by=auth.uid() and coalesce(public.has_permission('submit_purchase_requests'),false))) then raise exception 'Not authorized';end if;
 if r.status<>'requested' then raise exception 'This request is no longer awaiting review. Reload to see the decision.';end if;
 if p_revision is null or r.revision<>p_revision then raise exception 'This request changed. Reload before editing.';end if;
 if p_cancel is null then raise exception 'Choose an action';end if;
 previous:=jsonb_build_object('item_name',r.item_name,'quantity',r.quantity,'estimated_cost',r.estimated_cost,'supplier',r.supplier,'product_url',r.product_url,'urgency',r.urgency,'reason',r.reason,'part_id',r.part_id,'revision',r.revision);
 if p_cancel then
  update public.frc_purchase_requests set status='cancelled',updated_at=now() where id=r.id returning * into r;
 else
  linked:=nullif(p_values->>'part_id','')::uuid;
  item:=trim(p_values->>'item_name');
  if linked is not null then select name into item from public.frc_parts_inventory where id=linked and not archived;if not found then raise exception 'Choose an available inventory item';end if;end if;
  if coalesce(length(item),0)=0 or coalesce(length(trim(p_values->>'reason')),0)<3 or coalesce((p_values->>'quantity')::numeric,0)<=0 or (p_values->>'quantity')::numeric<>round((p_values->>'quantity')::numeric,2) then raise exception 'Enter an item, reason and valid quantity';end if;
  if coalesce(p_values->>'urgency','') not in ('low','normal','high','critical') then raise exception 'Choose a valid urgency';end if;
  if nullif(p_values->>'product_url','') is not null and p_values->>'product_url' !~ '^https?://' then raise exception 'Use an http or https product link';end if;
  if (p_values->>'quantity')::numeric='NaN'::numeric or nullif(p_values->>'estimated_cost','')::numeric='NaN'::numeric then raise exception 'Enter finite numeric values';end if;
  update public.frc_purchase_requests set part_id=linked,item_name=item,quantity=(p_values->>'quantity')::numeric,
   estimated_cost=nullif(p_values->>'estimated_cost','')::numeric,supplier=nullif(trim(p_values->>'supplier'),''),product_url=nullif(trim(p_values->>'product_url'),''),urgency=p_values->>'urgency',reason=trim(p_values->>'reason'),updated_at=now()
   where id=r.id returning * into r;
 end if;
 insert into public.frc_purchase_status_history(purchase_id,from_status,to_status,note,changed_by,before_values,after_values)
 values(r.id,'requested',r.status,case when p_cancel then 'Request cancelled' else 'Request corrected' end,auth.uid(),previous,jsonb_build_object('item_name',r.item_name,'quantity',r.quantity,'estimated_cost',r.estimated_cost,'supplier',r.supplier,'product_url',r.product_url,'urgency',r.urgency,'reason',r.reason,'part_id',r.part_id,'revision',r.revision));
 return r;
end$$;
revoke all on function public.correct_purchase_request(uuid,integer,boolean,jsonb) from public,anon;
grant execute on function public.correct_purchase_request(uuid,integer,boolean,jsonb) to authenticated;

create or replace function public.approve_purchase_revision(p_purchase uuid,p_revision integer,p_quantity numeric,p_remainder text default 'deferred',p_note text default null)
returns public.frc_purchase_requests language plpgsql security definer set search_path=public as $$
declare r public.frc_purchase_requests;
begin
 if not coalesce(public.is_admin(),false) then raise exception 'Only administrators may approve purchases';end if;
 select * into r from public.frc_purchase_requests where id=p_purchase for update;
 if not found or p_revision is null or r.revision<>p_revision then raise exception 'This request changed. Reload and review the latest values.';end if;
 return public.approve_purchase_quantity(p_purchase,p_quantity,p_remainder,p_note);
end$$;
revoke all on function public.approve_purchase_revision(uuid,integer,numeric,text,text) from public,anon;
grant execute on function public.approve_purchase_revision(uuid,integer,numeric,text,text) to authenticated;
create or replace function public.transition_purchase_revision(p_purchase_id uuid,p_revision integer,p_status text,p_note text default null)
returns public.frc_purchase_requests language plpgsql security definer set search_path=public as $$
declare r public.frc_purchase_requests;
begin
 if not coalesce(public.is_admin(),false) then raise exception 'Only administrators may change purchase status';end if;
 select * into r from public.frc_purchase_requests where id=p_purchase_id for update;
 if not found or p_revision is null or r.revision<>p_revision then raise exception 'This request changed. Reload and review the latest values.';end if;
 return public.transition_purchase_request(p_purchase_id,p_status,p_note);
end$$;
revoke all on function public.transition_purchase_revision(uuid,integer,text,text) from public,anon;
grant execute on function public.transition_purchase_revision(uuid,integer,text,text) to authenticated;
-- Older clients must refresh before deciding: never approve an unseen correction.
revoke execute on function public.approve_purchase_quantity(uuid,numeric,text,text) from public,anon,authenticated;
revoke execute on function public.transition_purchase_request(uuid,text,text) from public,anon,authenticated;
commit;
