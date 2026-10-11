begin;
create table if not exists public.mechanical_calculations(
 id uuid primary key,owner_id uuid not null references public.team_members(id),revision integer not null,
 title text not null,team_shared boolean not null default false,assembly_id uuid references public.robot_build_assemblies(id),
 document jsonb not null,updated_at timestamptz not null default now(),check(length(title) between 1 and 120)
);
create table if not exists public.mechanical_calculation_versions(
 calculation_id uuid not null references public.mechanical_calculations(id),revision integer not null,
 document jsonb not null,request_id uuid not null unique,created_by uuid not null references public.team_members(id),
 created_at timestamptz not null default now(),primary key(calculation_id,revision)
);
alter table public.mechanical_calculations enable row level security;
alter table public.mechanical_calculation_versions enable row level security;
revoke all on public.mechanical_calculations,public.mechanical_calculation_versions from public,anon,authenticated;
grant select on public.mechanical_calculations,public.mechanical_calculation_versions to authenticated;
create policy mechanical_read on public.mechanical_calculations for select to authenticated using(
 exists(select 1 from public.team_members where id=auth.uid() and active) and (owner_id=auth.uid() or team_shared)
 and (assembly_id is null or exists(select 1 from public.robot_build_assemblies where id=assembly_id))
);
create policy mechanical_versions_read on public.mechanical_calculation_versions for select to authenticated using(
 exists(select 1 from public.mechanical_calculations c where c.id=calculation_id and
 (c.owner_id=auth.uid() or mechanical_calculation_versions.document->>'shared'='true'))
);
create or replace function public.save_mechanical_calculation(p_id uuid,p_expected integer,p_document jsonb,p_request uuid)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare c mechanical_calculations%rowtype;v mechanical_calculation_versions%rowtype;a uuid;i jsonb;n integer;
begin
 if not exists(select 1 from team_members where id=auth.uid() and active) then raise exception 'Active member required';end if;
 if p_id is null or p_request is null or p_expected is null or p_expected<0 then raise exception 'Invalid save identity';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,6741));
 if p_document is null or jsonb_typeof(p_document)<>'object' or octet_length(p_document::text)>20000
 or length(trim(coalesce(p_document->>'title',''))) not between 1 and 120
 or length(coalesce(p_document->>'notes',''))>3000 or p_document->>'engine' is distinct from 'g3-drive-1'
 or jsonb_typeof(p_document->'shared') is distinct from 'boolean' then raise exception 'Invalid calculation document';end if;
 i:=p_document->'input';
 if jsonb_typeof(i) is distinct from 'object' or coalesce(i->>'kind','') not in ('belt','chain') or coalesce(i->>'mode','') not in ('length','spacing')
 or coalesce(i->>'round','') not in ('nearest','up','down') or jsonb_typeof(i->'even') is distinct from 'boolean'
 then raise exception 'Invalid calculation input';end if;
 if exists(select 1 from unnest(array['pitch','n1','n2','center','count','adjustment']) k where jsonb_typeof(i->k) is distinct from 'number') then raise exception 'Numeric dimensions required';end if;
 if (i->>'pitch')::numeric not between 1 and 50 or (i->>'n1')::numeric not between 8 and 400 or (i->>'n2')::numeric not between 8 and 400
 or mod((i->>'n1')::numeric,1)<>0 or mod((i->>'n2')::numeric,1)<>0 or abs((i->>'adjustment')::numeric)>25
 or (i->>'center')::numeric not between 0 and 10000 or (i->>'count')::numeric not between 1 and 20000
 then raise exception 'Dimensions outside supported range';end if;
 a:=nullif(p_document->>'assembly','')::uuid;
 if a is not null and not exists(select 1 from robot_build_assemblies x join team_projects p on p.id=x.project_id where x.id=a and p.status not in ('archived','completed')) then raise exception 'Choose an active build assembly';end if;
 select * into c from mechanical_calculations where id=p_id for update;
 if c.id is not null and c.owner_id<>auth.uid() then raise exception 'Only the owner can edit. Save a personal copy';end if;
 select * into v from mechanical_calculation_versions where request_id=p_request;
 if found then
  if v.calculation_id=p_id and v.created_by=auth.uid() and v.document=p_document then return v.revision;end if;
  raise exception 'Request already used';
 end if;
 if coalesce(c.revision,0)<>p_expected then raise exception 'Calculation changed on another device. Open the latest version or save a copy';end if;
 n:=p_expected+1;
 insert into mechanical_calculations(id,owner_id,revision,title,team_shared,assembly_id,document)
 values(p_id,auth.uid(),n,trim(p_document->>'title'),(p_document->>'shared')::boolean,a,p_document)
 on conflict(id)do update set revision=n,title=excluded.title,team_shared=excluded.team_shared,assembly_id=a,document=p_document,updated_at=now();
 insert into mechanical_calculation_versions values(p_id,n,p_document,p_request,auth.uid(),now());
 return n;
end$$;
revoke all on function public.save_mechanical_calculation(uuid,integer,jsonb,uuid) from public,anon;
grant execute on function public.save_mechanical_calculation(uuid,integer,jsonb,uuid) to authenticated;
commit;
