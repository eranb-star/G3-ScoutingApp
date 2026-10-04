-- Private code is separate from paid AI permission. Additive and rerunnable.
begin;
insert into public.app_permissions(permission_key,permission_group,label,label_he,description,protected,sort_order)
values('use_private_robot_code','Engineering lab','Read private robot code','קריאת קוד רובוט פרטי','Read the three connected G3 robot repositories. G3 Assist also requires its separate paid AI permission.',false,181)
on conflict(permission_key) do update set label=excluded.label,label_he=excluded.label_he,description=excluded.description;
insert into public.role_permissions(role,permission_key,allowed)
select role,'use_private_robot_code',role='admin' from (values('member'),('team_leader'),('mentor'),('admin')) roles(role)
on conflict(role,permission_key) do nothing;
commit;
