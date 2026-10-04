import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const {PGlite}=await import(process.env.PGLITE_MODULE?pathToFileURL(process.env.PGLITE_MODULE).href:'../../../docs/staging/ops-qa/node_modules/@electric-sql/pglite/dist/index.js');
const db=new PGlite();
await db.exec('create role anon; create role authenticated; create role service_role; create table team_members(id uuid primary key);');
const sql=await fs.readFile('../../backend/supabase/cad_onshape_connection_20261004.sql','utf8');
await db.exec(sql);await db.exec(sql);
await db.exec('create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);');
const workflow=await fs.readFile('../../backend/supabase/cad_review_workflow_20261004.sql','utf8');await db.exec(workflow);await db.exec(workflow);
const member='00000000-0000-0000-0000-000000000001';
await db.query('insert into team_members values($1)',[member]);
const row=(await db.query("insert into cad_connections(member_id,credential,expires_at) values($1,'{}',now()) returning id",[member])).rows[0];
assert.equal((await db.query('select claim_cad_refresh($1) acquired',[row.id])).rows[0].acquired,true);
assert.equal((await db.query('select claim_cad_refresh($1) acquired',[row.id])).rows[0].acquired,false);
await db.query("update cad_connections set disconnected_at=now(),refresh_lock_until=null where id=$1",[row.id]);
assert.equal((await db.query('select claim_cad_refresh($1) acquired',[row.id])).rows[0].acquired,false);
for(const role of ['anon','authenticated']){
 await db.exec(`set role ${role}`);
 for(const table of ['cad_connections','cad_oauth_states','cad_sources','cad_snapshots','cad_reviews','cad_findings'])await assert.rejects(db.query(`select * from ${table}`),/permission denied/);
 await assert.rejects(db.query('select claim_cad_refresh($1)',[row.id]),/permission denied/);
 await db.exec('reset role');
}
await db.close();
console.log('PASS: migration rerun, exclusive refresh lock, disconnected lock denial and no client credential/evidence access');
