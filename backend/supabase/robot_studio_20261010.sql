-- Additive studio storage. No changes to inventory, CAD credentials or existing build records.
begin;
create table if not exists public.robot_studio_scenes(
 id uuid primary key,owner_id uuid not null references public.team_members(id),name text not null,
 revision integer not null default 0,document jsonb not null,updated_at timestamptz not null default now(),
 lease_user uuid,lease_client uuid,lease_until timestamptz,
 check(length(name) between 1 and 120),check(octet_length(document::text)<=2000000)
);
create table if not exists public.robot_studio_members(
 scene_id uuid not null references public.robot_studio_scenes(id),member_id uuid not null references public.team_members(id),
 role text not null check(role in ('viewer','editor')),primary key(scene_id,member_id)
);
create table if not exists public.robot_studio_versions(
 scene_id uuid not null references public.robot_studio_scenes(id),revision integer not null,document jsonb not null,
 request_id uuid not null unique,created_by uuid not null references public.team_members(id),created_at timestamptz not null default now(),primary key(scene_id,revision)
);
create table if not exists public.robot_studio_assets(
 path text primary key,owner_id uuid not null references public.team_members(id),name text not null,
 created_at timestamptz not null default now(),check(length(name) between 1 and 180)
);
alter table public.robot_studio_scenes enable row level security;
alter table public.robot_studio_members enable row level security;
alter table public.robot_studio_versions enable row level security;
alter table public.robot_studio_assets enable row level security;
revoke all on public.robot_studio_scenes,public.robot_studio_members,public.robot_studio_versions,public.robot_studio_assets from public,anon,authenticated;
grant select on public.robot_studio_scenes,public.robot_studio_members,public.robot_studio_versions,public.robot_studio_assets to authenticated;

create or replace function public.studio_source_access(p_document jsonb)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from team_members where id=auth.uid() and active)
 and not exists(select 1 from jsonb_array_elements(p_document->'assets') a where a->>'kind'='onshape' and not exists(
 select 1 from cad_snapshots sn join cad_sources src on src.id=sn.source_id where sn.id::text=a->>'snapshotId'
 and src.id::text=a->>'sourceId' and src.archived_at is null and cad_connection_access(auth.uid(),src.connection_id)));
$$;
create or replace function public.studio_access(p_scene uuid,p_edit boolean default false)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from robot_studio_scenes s where s.id=p_scene and studio_source_access(s.document)
 and (s.owner_id=auth.uid() or exists(select 1 from robot_studio_members m where m.scene_id=s.id and m.member_id=auth.uid() and (not p_edit or m.role='editor'))));
$$;
create or replace function public.studio_asset_access(p_path text)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from team_members where id=auth.uid() and active) and
 (exists(select 1 from robot_studio_assets where path=p_path and owner_id=auth.uid())
 or exists(select 1 from robot_studio_versions v where studio_access(v.scene_id) and studio_source_access(v.document)
 and exists(select 1 from jsonb_array_elements(v.document->'assets') a where a->>'path'=p_path)));
$$;
revoke all on function public.studio_source_access(jsonb),public.studio_access(uuid,boolean),public.studio_asset_access(text) from public,anon;
grant execute on function public.studio_source_access(jsonb),public.studio_access(uuid,boolean),public.studio_asset_access(text) to authenticated;
drop policy if exists studio_scene_read on public.robot_studio_scenes;
create policy studio_scene_read on public.robot_studio_scenes for select to authenticated using(studio_access(id));
drop policy if exists studio_version_read on public.robot_studio_versions;
create policy studio_version_read on public.robot_studio_versions for select to authenticated using(studio_access(scene_id) and studio_source_access(document));
drop policy if exists studio_member_read on public.robot_studio_members;
create policy studio_member_read on public.robot_studio_members for select to authenticated using(studio_access(scene_id));
drop policy if exists studio_asset_read on public.robot_studio_assets;
create policy studio_asset_read on public.robot_studio_assets for select to authenticated using(studio_asset_access(path));

create or replace function public.save_robot_studio(p_id uuid,p_expected integer,p_document jsonb,p_request uuid,p_client uuid)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare s robot_studio_scenes%rowtype;v robot_studio_versions%rowtype;a jsonb;n integer;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,6740));
 if p_id is null or p_request is null or p_client is null or not exists(select 1 from team_members where id=auth.uid() and active) then raise exception 'Active member required';end if;
 if p_document->>'schema' is distinct from '1' or jsonb_typeof(p_document->'options') is distinct from 'array'
 or jsonb_typeof(p_document->'assets') is distinct from 'array' or jsonb_typeof(p_document->'views') is distinct from 'array'
 or length(trim(coalesce(p_document->>'name',''))) not between 1 and 120 or octet_length(p_document::text)>2000000
 then raise exception 'Invalid studio document';end if;
 if jsonb_array_length(p_document->'options') not between 1 and 12 or jsonb_array_length(p_document->'assets')>100 or jsonb_array_length(p_document->'views')>40
 or exists(select 1 from jsonb_array_elements(p_document->'options') o where jsonb_typeof(o->'parts') is distinct from 'array' or jsonb_array_length(o->'parts')>500)
 then raise exception 'Studio limit exceeded';end if;
 if not studio_source_access(p_document) then raise exception 'CAD source is not accessible';end if;
 select * into s from robot_studio_scenes where id=p_id for update;
 if s.id is not null and not studio_access(p_id,true) then raise exception 'Design edit permission required';end if;
 select * into v from robot_studio_versions where request_id=p_request;
 if v.scene_id is not null then
  if v.scene_id=p_id and v.created_by=auth.uid() and v.document=p_document then return v.revision;end if;
  raise exception 'Request identity already used';
 end if;
 if coalesce(s.revision,0) is distinct from p_expected then raise exception 'Design changed. Reload or save a separate copy';end if;
 if s.lease_until>now() and s.lease_client is distinct from p_client then raise exception 'Another editor holds this design';end if;
 for a in select value from jsonb_array_elements(p_document->'assets') loop
  if coalesce(a->>'kind','') not in ('upload','onshape','catalogue') then raise exception 'Unsupported asset';end if;
  if a->>'kind'='upload' and (not studio_asset_access(a->>'path') or not (
   exists(select 1 from robot_studio_assets x where x.path=a->>'path' and x.owner_id=auth.uid())
   or exists(select 1 from jsonb_array_elements(s.document->'assets') x where x->>'path'=a->>'path')
  )) then raise exception 'Use your own upload or an existing asset in this design';end if;
 end loop;
 n:=p_expected+1;
 if s.id is null then
  insert into robot_studio_scenes(id,owner_id,name,revision,document,lease_user,lease_client,lease_until)
  values(p_id,auth.uid(),trim(p_document->>'name'),n,p_document,auth.uid(),p_client,now()+interval '90 seconds');
 else
  update robot_studio_scenes set name=trim(p_document->>'name'),revision=n,document=p_document,updated_at=now(),lease_user=auth.uid(),lease_client=p_client,lease_until=now()+interval '90 seconds' where id=p_id;
 end if;
 insert into robot_studio_versions(scene_id,revision,document,request_id,created_by)values(p_id,n,p_document,p_request,auth.uid());
 return n;
end$$;
create or replace function public.claim_robot_studio(p_id uuid,p_client uuid,p_release boolean default false)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if p_client is null or not studio_access(p_id,true) then raise exception 'Design edit permission required';end if;
 update robot_studio_scenes set lease_user=case when p_release then null else auth.uid() end,lease_client=case when p_release then null else p_client end,
 lease_until=case when p_release then null else now()+interval '90 seconds' end
 where id=p_id and (lease_until is null or lease_until<now() or lease_client=p_client);
 return found;
end$$;
create or replace function public.share_robot_studio(p_id uuid,p_member uuid,p_role text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not exists(select 1 from robot_studio_scenes where id=p_id and owner_id=auth.uid()) or not studio_access(p_id) then raise exception 'Only the design owner can share';end if;
 if not exists(select 1 from team_members where id=p_member and active) then raise exception 'Active recipient required';end if;
 if p_role is null then delete from robot_studio_members where scene_id=p_id and member_id=p_member;
 else insert into robot_studio_members(scene_id,member_id,role) values(p_id,p_member,p_role) on conflict(scene_id,member_id)do update set role=excluded.role;end if;
end$$;
create or replace function public.register_robot_studio_asset(p_path text,p_name text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not exists(select 1 from team_members where id=auth.uid() and active) or split_part(p_path,'/',1)<>auth.uid()::text
 or not exists(select 1 from storage.objects where bucket_id='robot-studio-assets' and name=p_path)
 then raise exception 'Upload your model before registering it';end if;
 insert into robot_studio_assets(path,owner_id,name)values(p_path,auth.uid(),p_name) on conflict(path)do nothing;
end$$;
revoke all on function public.save_robot_studio(uuid,integer,jsonb,uuid,uuid),public.claim_robot_studio(uuid,uuid,boolean),public.share_robot_studio(uuid,uuid,text),public.register_robot_studio_asset(text,text) from public,anon;
grant execute on function public.save_robot_studio(uuid,integer,jsonb,uuid,uuid),public.claim_robot_studio(uuid,uuid,boolean),public.share_robot_studio(uuid,uuid,text),public.register_robot_studio_asset(text,text) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit)values('robot-studio-assets','robot-studio-assets',false,41943040)on conflict(id)do nothing;
drop policy if exists studio_upload on storage.objects;
create policy studio_upload on storage.objects for insert to authenticated with check(bucket_id='robot-studio-assets' and split_part(name,'/',1)=auth.uid()::text and exists(select 1 from public.team_members where id=auth.uid() and active));
drop policy if exists studio_download on storage.objects;
create policy studio_download on storage.objects for select to authenticated using(bucket_id='robot-studio-assets' and public.studio_asset_access(name));
commit;
