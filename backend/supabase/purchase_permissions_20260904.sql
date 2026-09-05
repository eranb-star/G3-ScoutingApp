-- Separate purchase requesting from inventory management and administrator approval.
begin;

insert into public.app_permissions(permission_key,permission_group,label,label_he,description,protected,sort_order)
values('submit_purchase_requests','Operations','Submit purchase requests','שליחת בקשות רכש','Create a justified request for administrator review. This does not grant approval authority.',false,91)
on conflict(permission_key) do update set permission_group=excluded.permission_group,label=excluded.label,label_he=excluded.label_he,description=excluded.description,protected=excluded.protected,sort_order=excluded.sort_order;

insert into public.role_permissions(role,permission_key,allowed) values
 ('member','submit_purchase_requests',false),
 ('team_leader','submit_purchase_requests',true),
 ('mentor','submit_purchase_requests',true),
 ('admin','submit_purchase_requests',true)
on conflict(role,permission_key) do nothing;

drop policy if exists "members request purchases" on public.frc_purchase_requests;
drop policy if exists "authorized request purchases" on public.frc_purchase_requests;
create policy "authorized request purchases" on public.frc_purchase_requests
for insert to authenticated
with check(requested_by=auth.uid() and public.has_permission('submit_purchase_requests'));

-- Approval, rejection, ordering and receiving remain protected by the existing
-- administrators-only update policy.
commit;
