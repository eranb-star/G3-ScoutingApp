-- Keep purchasing requests collaborative while reserving inventory control and
-- purchasing decisions for administrators.
begin;

insert into public.role_permissions(role, permission_key, allowed) values
  ('member', 'manage_inventory', false),
  ('team_leader', 'manage_inventory', false),
  ('mentor', 'manage_inventory', false),
  ('admin', 'manage_inventory', true),
  ('member', 'submit_purchase_requests', false),
  ('team_leader', 'submit_purchase_requests', true),
  ('mentor', 'submit_purchase_requests', true),
  ('admin', 'submit_purchase_requests', true)
on conflict(role, permission_key) do update
set allowed = excluded.allowed,
    updated_at = now();

commit;
