-- Baseline 0: metadata only. No application rows, secrets or function bodies.
begin transaction read only;
with inventory as (
 select 'relations' as category, coalesce(jsonb_agg(to_jsonb(x) order by x.schema,x.name),'[]') as details from (
  select n.nspname as schema,c.relname as name,c.relkind as kind,c.relrowsecurity as rls,c.relforcerowsecurity as force_rls,
    c.reloptions as options,pg_get_userbyid(c.relowner) as owner,
    case when c.relkind in ('v','m') then md5(pg_get_viewdef(c.oid,true)) end as view_hash
  from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','storage') and c.relkind in ('r','p','v','m')
 )x
 union all select 'columns',coalesce(jsonb_agg(to_jsonb(x) order by x.table_schema,x.table_name,x.ordinal_position),'[]') from (
  select table_schema,table_name,column_name,ordinal_position,data_type,udt_name,is_nullable,column_default
  from information_schema.columns where table_schema in ('public','storage')
 )x
 union all select 'policies',coalesce(jsonb_agg(to_jsonb(x) order by x.schemaname,x.tablename,x.policyname),'[]') from (
  select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check from pg_policies where schemaname in ('public','storage')
 )x
 union all select 'routines',coalesce(jsonb_agg(to_jsonb(x) order by x.schema,x.name,x.arguments),'[]') from (
  select n.nspname as schema,p.proname as name,pg_get_function_identity_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as result,p.prosecdef as security_definer,p.provolatile as volatility,
  p.proconfig as settings,p.proacl as grants,pg_get_userbyid(p.proowner) as owner,md5(pg_get_functiondef(p.oid)) as definition_hash
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prokind in ('f','p')
 )x
 union all select 'constraints',coalesce(jsonb_agg(to_jsonb(x) order by x.table_name,x.name),'[]') from (
  select c.conrelid::regclass::text as table_name,c.conname as name,c.contype as type,pg_get_constraintdef(c.oid,true) as definition
  from pg_constraint c join pg_namespace n on n.oid=c.connamespace where n.nspname='public'
 )x
 union all select 'triggers',coalesce(jsonb_agg(to_jsonb(x) order by x.table_name,x.name),'[]') from (
  select c.oid::regclass::text as table_name,t.tgname as name,t.tgenabled as enabled,pg_get_triggerdef(t.oid,true) as definition
  from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and not t.tgisinternal
 )x
 union all select 'indexes',coalesce(jsonb_agg(to_jsonb(x) order by x.tablename,x.indexname),'[]') from (
  select schemaname,tablename,indexname,indexdef from pg_indexes where schemaname in ('public','storage')
 )x
 union all select 'grants',coalesce(jsonb_agg(to_jsonb(x) order by x.table_schema,x.table_name,x.grantee,x.privilege_type),'[]') from (
  select table_schema,table_name,grantee,privilege_type,is_grantable from information_schema.table_privileges where table_schema in ('public','storage')
 )x
 union all select 'extensions',coalesce(jsonb_agg(to_jsonb(x) order by x.extname),'[]') from (select extname,extversion from pg_extension)x
 union all select 'buckets',coalesce(jsonb_agg(to_jsonb(x) order by x.id),'[]') from (select id,name,public,file_size_limit,allowed_mime_types from storage.buckets)x
)
select category,jsonb_array_length(details) as object_count,md5(details::text) as fingerprint,details from inventory order by category;
commit;
