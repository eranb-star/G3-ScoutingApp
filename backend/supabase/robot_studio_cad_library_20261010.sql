-- Empty-by-default catalogue: publication is a deliberate connection-owner action.
begin;
create table if not exists public.robot_studio_cad_library(
 snapshot_id uuid primary key references cad_snapshots(id),source_id uuid not null references cad_sources(id),
 name text not null,asset_path text not null,approved_by uuid not null references team_members(id),
 approved_at timestamptz not null default now(),revoked_at timestamptz
);
alter table robot_studio_cad_library enable row level security;
revoke all on robot_studio_cad_library from public,anon,authenticated;
grant select on robot_studio_cad_library to authenticated;
create or replace function public.studio_approved_cad(p_snapshot text)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from robot_studio_cad_library l join cad_sources s on s.id=l.source_id
 join cad_connections c on c.id=s.connection_id join team_members m on m.id=l.approved_by
 where l.snapshot_id::text=p_snapshot and l.revoked_at is null and c.disconnected_at is null and m.active
 and exists(select 1 from team_members where id=auth.uid() and active));
$$;
drop policy if exists studio_approved_read on robot_studio_cad_library;
create policy studio_approved_read on robot_studio_cad_library for select to authenticated using(studio_approved_cad(snapshot_id::text) or approved_by=auth.uid());
create or replace function public.studio_source_access(p_document jsonb)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from team_members where id=auth.uid() and active)
 and not exists(select 1 from jsonb_array_elements(p_document->'assets') a where a->>'kind'='onshape' and not exists(
 select 1 from cad_snapshots sn join cad_sources src on src.id=sn.source_id where sn.id::text=a->>'snapshotId'
 and src.id::text=a->>'sourceId' and ((src.archived_at is null and cad_connection_access(auth.uid(),src.connection_id)) or studio_approved_cad(sn.id::text))));
$$;
create or replace function public.publish_robot_studio_cad(p_snapshot uuid,p_enabled boolean)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare src cad_sources%rowtype;asset text;
begin
 select s.* into src from cad_sources s join cad_snapshots sn on sn.source_id=s.id join cad_connections c on c.id=s.connection_id
 where sn.id=p_snapshot and c.member_id=auth.uid() and cad_connection_access(auth.uid(),c.id);
 if src.id is null then raise exception 'Only the authorized connection owner can publish or revoke this snapshot';end if;
 asset:=src.connection_id::text||'/'||p_snapshot::text||'-v3.json';
 if p_enabled then
  if not exists(select 1 from storage.objects where bucket_id='cad-design-assets' and name=asset) then raise exception 'Inspect and import this geometry first';end if;
  insert into robot_studio_cad_library(snapshot_id,source_id,name,asset_path,approved_by)values(p_snapshot,src.id,src.name,asset,auth.uid())
  on conflict(snapshot_id)do update set revoked_at=null,approved_at=now();
 else update robot_studio_cad_library set revoked_at=now() where snapshot_id=p_snapshot;end if;
end$$;
drop policy if exists studio_approved_geometry on storage.objects;
create policy studio_approved_geometry on storage.objects for select to authenticated using(bucket_id='cad-design-assets' and exists(
 select 1 from public.robot_studio_cad_library l where l.asset_path=objects.name and public.studio_approved_cad(l.snapshot_id::text)));
revoke all on function public.studio_approved_cad(text),public.publish_robot_studio_cad(uuid,boolean) from public,anon;
grant execute on function public.studio_approved_cad(text),public.publish_robot_studio_cad(uuid,boolean) to authenticated;
-- Reject unusable shares before recording a grant; recipients cannot inherit source-account access.
create or replace function public.share_robot_studio(p_id uuid,p_member uuid,p_role text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare d jsonb;
begin
 select document into d from robot_studio_scenes where id=p_id and owner_id=auth.uid();
 if d is null or not studio_access(p_id) then raise exception 'Only the design owner can share';end if;
 if not exists(select 1 from team_members where id=p_member and active) then raise exception 'Active recipient required';end if;
 if p_role is not null and exists(select 1 from jsonb_array_elements(d->'assets') a where a->>'kind'='onshape' and not exists(
  select 1 from cad_snapshots sn join cad_sources src on src.id=sn.source_id where sn.id::text=a->>'snapshotId' and src.id::text=a->>'sourceId'
  and ((src.archived_at is null and cad_connection_access(p_member,src.connection_id)) or studio_approved_cad(sn.id::text))))
 then raise exception 'Recipient cannot access every CAD snapshot. Publish the exact snapshot or remove it from a separate shareable design';end if;
 if p_role is null then delete from robot_studio_members where scene_id=p_id and member_id=p_member;
 else insert into robot_studio_members(scene_id,member_id,role)values(p_id,p_member,p_role)on conflict(scene_id,member_id)do update set role=excluded.role;end if;
end$$;
commit;
