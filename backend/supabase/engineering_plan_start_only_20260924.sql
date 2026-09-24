-- Preserve existing access; allow a robot-start-only workspace.
begin;
create or replace function public.save_engineering_plan(p_id uuid,p_name text,p_workspace jsonb,p_expected integer,p_shared boolean)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare p public.engineering_plans;next_id uuid;
begin
 if public.can_use_engineering_plans() is not true then raise exception 'Engineering access required' using errcode='42501';end if;
 if length(trim(coalesce(p_name,''))) not between 1 and 120 or p_shared is null or p_expected is null then raise exception 'Invalid plan metadata';end if;
 if p_workspace is null or octet_length(p_workspace::text)>750000 or p_workspace->>'schema' is distinct from '1' or p_workspace#>>'{draft,status}' is distinct from 'unverified-planning-draft' or jsonb_typeof(p_workspace#>'{draft,route}') is distinct from 'array' or jsonb_typeof(p_workspace->'candidates') is distinct from 'array' then raise exception 'Invalid draft workspace';end if;
 if jsonb_array_length(p_workspace#>'{draft,route}') not between 1 and 100 or jsonb_array_length(p_workspace->'candidates')>20 then raise exception 'Draft limit exceeded';end if;
 perform pg_advisory_xact_lock(hashtextextended('engineering-plan-owner:'||auth.uid(),0));
 if (select coalesce(sum(octet_length(v.workspace::text)),0) from public.engineering_plan_versions v join public.engineering_plans owned on owned.id=v.plan_id where owned.owner_id=auth.uid())+octet_length(p_workspace::text)>20000000 then raise exception '20 MB plan-history account limit reached; export your workspace and contact an administrator';end if;
 if p_id is null then
  if p_expected<>0 then raise exception 'New plan must start at revision zero';end if;
  perform pg_advisory_xact_lock(hashtextextended('engineering-plan-owner:'||auth.uid(),0));
  if (select count(*) from public.engineering_plans where owner_id=auth.uid())>=100 then raise exception '100-plan account limit reached';end if;
  insert into public.engineering_plans(owner_id,name,shared) values(auth.uid(),trim(p_name),p_shared) returning * into p;
 else
  select * into p from public.engineering_plans where id=p_id and owner_id=auth.uid() for update;
  if not found then raise exception 'Only the plan owner can save a new revision' using errcode='42501';end if;
 end if;
 if p.revision<>p_expected then raise exception 'Plan changed on another device; reload or save a copy' using errcode='40001';end if;
 if p.revision>=200 then raise exception 'Version limit reached; save a new copy';end if;
 insert into public.engineering_plan_versions(plan_id,revision,workspace) values(p.id,p.revision+1,p_workspace);
 update public.engineering_plans set revision=p.revision+1,name=trim(p_name),shared=p_shared,updated_at=now() where id=p.id;
 return jsonb_build_object('id',p.id,'revision',p.revision+1);
end$$;
commit;
