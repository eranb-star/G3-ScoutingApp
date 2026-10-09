import fs from 'node:fs';import assert from 'node:assert/strict';
process.env.G3_BUILD_LOT_FIXTURE='1';
const {db,admin,first}=await import('./test-robot-build-integration.mjs');
await db.exec('reset role');
await db.exec(`create or replace function current_team_role()returns text language sql stable as $$select role from team_members where id=auth.uid() and active$$;
create or replace function is_admin()returns boolean language sql stable as $$select auth.uid()='${admin}'::uuid$$;
create or replace function fundraising_allowed()returns boolean language sql stable as $$select auth.uid()='${admin}'::uuid$$;
create table workshop_tools(id uuid primary key,name text,status text default 'available',amount integer default 1,requires_training boolean default false);
create table tool_checkouts(id uuid primary key default gen_random_uuid(),tool_id uuid,returned_at timestamptz);
create table tool_maintenance(tool_id uuid,status text);
create table tool_certifications(tool_id uuid,member_id uuid);
create schema if not exists storage;
create table if not exists storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint);
create table if not exists storage.objects(id uuid primary key,bucket_id text,name text);
alter table storage.objects enable row level security;`);
const read=file=>fs.readFileSync(new URL('../../../backend/supabase/'+file,import.meta.url),'utf8');
// Complete the nine-migration deployed baseline before rehearsing the additions.
await db.exec(read('robot_build_operations_20261009.sql'));
await db.exec(read('robot_build_purchase_reuse_20261009.sql'));
const issues=read('robot_issue_tracking_20260830.sql');await db.exec(issues.slice(0,issues.indexOf('insert into storage.buckets'))+'commit;');
await db.exec(read('predictive_maintenance_phase_20260831.sql'));
const files=['robot_build_workspace_20261009.sql','robot_build_material_reservations_20261009.sql','robot_build_preparation_20261009.sql','robot_build_lots_20261009.sql','cad_part_metadata_20261009.sql','robot_build_files_20261009.sql','robot_build_file_storage_20261009.sql','robot_build_kit_requirements_20261009.sql','robot_build_release_holds_20261009.sql','robot_build_maintenance_20261009.sql','workshop_resources_20261009.sql','robot_build_operation_order_20261009.sql','robot_build_pack_purchasing_20261009.sql','robot_build_adoption_20261009.sql','robot_build_stock_assembly_20261009.sql','robot_build_freshness_20261009.sql','robot_build_metadata_refresh_20261009.sql','robot_build_subsystems_20261009.sql','robot_build_wip_adoption_20261009.sql','robot_build_material_specs_20261009.sql','robot_build_remnants_20261009.sql','robot_build_disassembly_20261009.sql','robot_build_assembly_lots_20261009.sql'];
const reviewOid=(await first("select 'project_review_passed(uuid)'::regprocedure::oid as id")).id;
for(let pass=0;pass<2;pass++)for(const file of files)await db.exec(read(file));
assert.equal((await first("select 'project_review_passed(uuid)'::regprocedure::oid as id")).id,reviewOid,'shared review engine identity retained');
assert.equal((await first("select count(*)::int n from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace where ns.nspname='public' and p.proname like '%robot_build%' and p.proname not in ('record_robot_build_hold','robot_build_review_usable') and position('public.project_review_passed(' in p.prosrc)>0")).n,0,'no later migration reopens held build work');
assert.equal((await first("select public from storage.buckets where id='robot-build-files'")).public,false);
for(const table of ['robot_build_kits','robot_build_batches','robot_build_materials','robot_build_files','robot_build_component_links','workshop_resource_claims']){
 assert.equal((await first('select has_table_privilege($1,$2,$3) allowed',['authenticated',table,'INSERT,UPDATE,DELETE'])).allowed,false,table+' remains RPC-only');
}
assert.equal((await first("select count(*)::int n from pg_trigger where tgname in ('guard_stock_assembly_installation','guard_kit_demand_complete')")).n,2);
console.log('PASS all 23 additive migrations applied twice together, private bucket, RPC-only writes, unchanged shared review and no release-hold bypass');await db.close();
