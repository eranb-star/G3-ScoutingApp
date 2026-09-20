-- Requires roles_permissions_multi_team_20260904.sql. Additive and rerunnable.
begin;
insert into public.app_permissions(permission_key,permission_group,label,label_he,description,protected,sort_order)
values('use_g3_assist','Engineering lab','Use G3 Assist (paid AI)','שימוש ב-G3 Assist (בינה מלאכותית בתשלום)','Ask questions and analyze robot images with paid AI. Search and saved history are separate.',false,180)
on conflict(permission_key) do update set label=excluded.label,label_he=excluded.label_he,description=excluded.description;
insert into public.role_permissions(role,permission_key,allowed)
select role,'use_g3_assist',role in ('admin','mentor')
from (values('member'),('team_leader'),('mentor'),('admin')) roles(role)
on conflict(role,permission_key) do nothing;

create table if not exists public.g3_assist_permission_audit (
  id bigint generated always as identity primary key,
  actor_id uuid,
  role text not null,
  previous_allowed boolean,
  allowed boolean,
  changed_at timestamptz not null default now()
);
alter table public.g3_assist_permission_audit enable row level security;
revoke all on public.g3_assist_permission_audit from anon, authenticated;
grant select on public.g3_assist_permission_audit to authenticated;
drop policy if exists assist_permission_audit_read on public.g3_assist_permission_audit;
create policy assist_permission_audit_read on public.g3_assist_permission_audit
for select to authenticated using(public.is_admin());
create or replace function public.audit_g3_assist_permission()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if TG_OP='DELETE' then
    if OLD.permission_key='use_g3_assist' then
      insert into public.g3_assist_permission_audit(actor_id,role,previous_allowed,allowed) values(auth.uid(),OLD.role,OLD.allowed,null);
    end if;
    return OLD;
  end if;
  if NEW.permission_key='use_g3_assist' and (TG_OP='INSERT' or NEW.allowed is distinct from OLD.allowed) then
    insert into public.g3_assist_permission_audit(actor_id,role,previous_allowed,allowed)
    values(auth.uid(),NEW.role,case when TG_OP='UPDATE' then OLD.allowed else null end,NEW.allowed);
  end if;
  return NEW;
end;
$$;
revoke all on function public.audit_g3_assist_permission() from public;
drop trigger if exists audit_g3_assist_permission on public.role_permissions;
create trigger audit_g3_assist_permission after insert or update or delete on public.role_permissions
for each row execute function public.audit_g3_assist_permission();
commit;
