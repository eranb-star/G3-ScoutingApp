import fs from 'node:fs';
import {PGlite} from '../staging/ops-qa/node_modules/@electric-sql/pglite/dist/index.js';
const root=new URL('./evidence-pilot/',import.meta.url);
const chunks=JSON.parse(fs.readFileSync(new URL('chunks.json',root),'utf8'));
const manifest=JSON.parse(fs.readFileSync(new URL('manifest.json',root),'utf8'));
const db=new PGlite();
await db.exec(`create table pilot_passages(id bigint generated always as identity primary key,source integer,season integer,team integer,url text,locator text,body text,status text,hash text,search tsvector generated always as(to_tsvector('english',body)) stored);`);
for(const c of chunks)await db.query('insert into pilot_passages(source,season,team,url,locator,body,status,hash) values($1,$2,$3,$4,$5,$6,$7,$8)',[c.source,c.season??null,c.team??null,c.url,c.locator,c.text,c.status,c.hash]);
await db.exec('create index pilot_search on pilot_passages using gin(search); create index pilot_source on pilot_passages(source); analyze pilot_passages;');
const sizes=(await db.query("select count(*)::int passages,pg_table_size('pilot_passages')::bigint table_bytes,pg_indexes_size('pilot_passages')::bigint index_bytes,pg_total_relation_size('pilot_passages')::bigint total_bytes from pilot_passages")).rows[0];
const probes=[];
for(const term of ['PID','drivetrain','gripper','elevator','turret','deployment']){
const start=performance.now();const rows=(await db.query("select source,locator,left(body,250) excerpt from pilot_passages where search @@ plainto_tsquery('english',$1) order by source,id",[term])).rows;
probes.push({term,passages:rows.length,sources:[...new Set(rows.map(r=>r.source))],milliseconds:performance.now()-start,samples:rows.slice(0,2)});
}
const accepted=new Set(chunks.map(c=>c.source));
const report={checkedAt:new Date().toISOString(),engine:'Isolated in-memory PGlite PostgreSQL; experimental schema, not production schema or performance guarantee',sourcesFetched:manifest.filter(x=>x.status===200).length,sourcesExtracted:accepted.size,originalBytes:manifest.filter(x=>accepted.has(x.id)).reduce((n,x)=>n+(x.bytes||0),0),textBytes:chunks.reduce((n,x)=>n+Buffer.byteLength(x.text),0),sizes,probes,verifiedFactsAdded:0};
fs.writeFileSync(new URL('measurement.json',root),JSON.stringify(report,null,2));console.log(JSON.stringify(report));await db.close();
