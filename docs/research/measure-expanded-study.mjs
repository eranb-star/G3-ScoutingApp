import fs from 'node:fs';
import {PGlite} from '../staging/ops-qa/node_modules/@electric-sql/pglite/dist/index.js';
const root=new URL('./expanded-study/',import.meta.url);const chunks=JSON.parse(fs.readFileSync(new URL('passages.json',root)));const sources=JSON.parse(fs.readFileSync(new URL('extraction.json',root)));const db=new PGlite();const reports=[];
for(const [band,table]of [['top300','top300'],['301to500','extra200']]){
await db.exec(`create table ${table}(id bigint generated always as identity primary key,team integer,season integer,url text,post_id bigint,posted_at timestamptz,author text,body text,status text,hash text,search tsvector generated always as(to_tsvector('english',body)) stored)`);
const rows=chunks.filter(c=>c.band===band);
await db.exec('begin');for(const c of rows)await db.query(`insert into ${table}(team,season,url,post_id,posted_at,author,body,status,hash) values($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[c.team,c.year,c.url,c.post_id,c.posted_at,c.author,c.text,c.status,c.hash]);await db.exec('commit');
await db.exec(`create index ${table}_search on ${table} using gin(search);create index ${table}_team on ${table}(team,season);analyze ${table}`);
const sizes=(await db.query(`select pg_table_size('${table}')::bigint table_bytes,pg_indexes_size('${table}')::bigint index_bytes,pg_total_relation_size('${table}')::bigint total_bytes`)).rows[0];
const docs=sources.filter(s=>s.band===band);const terms={};for(const term of ['PID','elevator','turret','gripper','intake','swerve'])terms[term]=(await db.query(`select count(*)::int passages,count(distinct (team,season))::int team_seasons from ${table} where search @@ plainto_tsquery('english',$1)`,[term])).rows[0];
reports.push({band,threads:docs.length,completeThreads:docs.filter(s=>s.complete).length,posts:docs.reduce((n,s)=>n+s.posts,0),passages:rows.length,textBytes:docs.reduce((n,s)=>n+s.textBytes,0),uniquePassageHashes:new Set(rows.map(c=>c.hash)).size,sizes,terms});}
const binder=JSON.parse(fs.readFileSync(new URL('binder-deduplicated.json',root)));
await db.exec("create table binder(id bigint generated always as identity primary key,pages integer[],body text,search tsvector generated always as(to_tsvector('english',body)) stored)");
for(const c of binder)await db.query('insert into binder(pages,body) values($1,$2)',[c.pages,c.text]);await db.exec('create index binder_search on binder using gin(search)');
const binderSize=(await db.query("select pg_total_relation_size('binder')::bigint total_bytes")).rows[0];
const report={checkedAt:new Date().toISOString(),engine:'isolated in-memory PGlite; measured relation sizes; not production schema',reports,binder:{distinctPassages:binder.length,...binderSize}};fs.writeFileSync(new URL('measurement.json',root),JSON.stringify(report,null,2));console.log(JSON.stringify(report));await db.close();
