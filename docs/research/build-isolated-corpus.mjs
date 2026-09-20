// Offline research staging only. No environment credentials, network or production connection.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {PGlite} from '../staging/ops-qa/node_modules/@electric-sql/pglite/dist/index.js';
const root=new URL('./',import.meta.url);const read=p=>JSON.parse(fs.readFileSync(new URL(p,root),'utf8'));const hash=t=>createHash('sha256').update(t).digest('hex');
if(fs.existsSync(new URL('full-collection/jobs.json',root)))await import('./check-collection-integrity.mjs');
const documents=new Map(),texts=new Map(),occurrences=[];
function add(source,text,locator){
 if(!text.trim())return;const key=source.url+'#'+source.versionHash;
 if(!documents.has(key))documents.set(key,{id:documents.size+1,...source});
 const h=hash(text);texts.set(h,text);occurrences.push({source:documents.get(key).id,hash:h,locator});
}
const threadPassages=read('expanded-study/passages.json');
const fullSources=fs.existsSync(new URL('full-collection/extracted-sources.json',root))?read('full-collection/extracted-sources.json'):[];
const fullUrls=new Set(fullSources.map(s=>s.url));
for(const name of fs.readdirSync(new URL('expanded-study/',root)).filter(n=>/^complete-.*\.json$/.test(n))){
 const raw=fs.readFileSync(new URL('expanded-study/'+name,root));const data=JSON.parse(raw);const versionHash=hash(raw);
 if(fullUrls.has(data.url))continue;
 for(const p of threadPassages.filter(p=>p.team===data.team&&p.year===data.year))add({url:data.url,versionHash,kind:'forum-thread',citingTeam:data.team,citingSeason:data.year,publisherTeam:null,documentSeason:null,status:'unreviewed'},p.text,{postUrl:p.url,postId:p.post_id,postedAt:p.posted_at,author:p.author,offset:p.offset});
}
if(fullSources.length){const byUrl=new Map(fullSources.map(s=>[s.url,s]));for(const p of read('full-collection/passages.json'))add(byUrl.get(p.sourceUrl),p.text,p.locator);}
const manifest=read('evidence-pilot/manifest.json');
for(const p of read('evidence-pilot/chunks.json')){const m=manifest.find(m=>m.id===p.source);add({url:m.url,versionHash:m.sha256,kind:m.kind,title:m.title,citingTeam:m.team??null,citingSeason:m.season??null,publisherTeam:null,documentSeason:m.kind==='official-manual'?m.season:null,status:'unreviewed'},p.text,{locator:p.locator,offset:p.offset});}
const binder=read('expanded-study/binder-manifest.json');
for(const p of read('expanded-study/binder-passages.json'))add({url:binder.url,versionHash:binder.sha256,kind:'technical-binder',title:'Team 1757 · 2023 technical binder',publisherTeam:1757,documentSeason:2023,status:'unreviewed'},p.text,{page:p.page});
const attributions=read('linked-document-attribution.json'),extractions=read('linked-documents/extraction.json');
for(const m of read('linked-documents/manifest.json').filter(m=>m.file)){
 const a=attributions.find(a=>m.url.includes(a.urlContains))||{};const e=extractions.find(e=>e.url===m.url);
 const source={url:m.url,versionHash:m.sha256,kind:'linked-pdf',publisherTeam:a.publisherTeam??null,documentSeason:a.documentSeason??null,title:a.title??null,scope:a.scope??null,publicationDate:a.publicationDate??null,attributionBasis:a.basis??null,quarantinedPages:e?.quarantinedPages||[],status:'unreviewed'};
 const key=source.url+'#'+source.versionHash;if(!documents.has(key))documents.set(key,{id:documents.size+1,...source});
 for(const p of read('linked-documents/passages.json').filter(p=>p.sourceUrl===m.url))add(source,p.text,{page:p.page,offset:p.offset});
}
if(fs.existsSync(new URL('wpilib-reference/manifest.json',root))){
 for(const m of read('wpilib-reference/manifest.json').filter(m=>m.status==='collected')){
  const text=fs.readFileSync(new URL('wpilib-reference/'+m.file,root),'utf8');if(hash(Buffer.from(text,'utf8'))!==m.sha256)throw new Error('WPILib file hash mismatch');
  const lines=text.split(/\r?\n/);const heading=lines.findIndex((line,i)=>i>0&&/^[=~-]{3,}$/.test(line.trim()));
  const markdownTitle=lines.find(line=>/^#\s+\S/.test(line))?.replace(/^#\s+/,'');
  const title='WPILib · '+(markdownTitle||(heading>0?lines[heading-1]:m.path.split('/').at(-1)));
  const source={url:m.sourceUrl,title,versionHash:m.sha256,kind:'official-technical-doc',publisher:'WPILib',commit:m.commit,scope:m.path.includes('/beta/')?'beta documentation':m.path.includes('/contributing/')?'contributor documentation':'development documentation snapshot',publisherTeam:null,documentSeason:null,status:'unreviewed'};
  let start=0,body='';const flush=end=>{if(body.trim())add(source,body.trim(),{postUrl:m.sourceUrl+`#L${start+1}-L${end}`,lineStart:start+1,lineEnd:end,format:'original RST/Markdown source'});};
  for(let i=0;i<lines.length;i++){if(body.length+lines[i].length>2000&&body){flush(i);start=i;body='';}body+=lines[i]+'\n';}flush(lines.length);
 }
}
const db=new PGlite();
await db.exec(`create table sources(id integer primary key,url text not null,version_hash text not null,kind text not null,metadata jsonb not null,status text not null check(status='unreviewed'),unique(url,version_hash));create table passages(hash text primary key,body text not null,search tsvector generated always as(to_tsvector('english',body)) stored);create table citations(id bigint generated always as identity primary key,source integer references sources(id),hash text references passages(hash),locator jsonb not null);`);
await db.exec('begin');for(const s of documents.values())await db.query('insert into sources values($1,$2,$3,$4,$5,$6)',[s.id,s.url,s.versionHash,s.kind,JSON.stringify(s),s.status]);
for(const [h,text]of texts)await db.query('insert into passages(hash,body) values($1,$2)',[h,text]);
for(const c of occurrences)await db.query('insert into citations(source,hash,locator) values($1,$2,$3)',[c.source,c.hash,JSON.stringify(c.locator)]);await db.exec('commit');
await db.exec('create index passage_search on passages using gin(search);create index citation_hash on citations(hash);create index citation_source on citations(source);analyze');
const sizes=(await db.query("select c.relname,pg_total_relation_size(c.oid)::bigint bytes from pg_class c join pg_namespace n on c.relnamespace=n.oid where n.nspname='public' and c.relkind='r' order by c.relname")).rows;
const documentIds=new Set([...documents.values()].map(s=>s.id));
const checks={allSourcesUnreviewed:[...documents.values()].every(s=>s.status==='unreviewed'),allCitationsResolvable:occurrences.every(c=>texts.has(c.hash)&&documentIds.has(c.source)),duplicateTextRetainsCitations:occurrences.length>texts.size};if(Object.values(checks).some(x=>!x))throw new Error('Corpus invariant failed');
const report={checkedAt:new Date().toISOString(),sourceVersions:documents.size,uniquePassages:texts.size,citationOccurrences:occurrences.length,duplicateOccurrences:occurrences.length-texts.size,relationSizes:sizes,indexedBytes:sizes.reduce((n,s)=>n+Number(s.bytes),0),checks,verifiedFacts:0,productionWrites:0};
fs.mkdirSync(new URL('isolated-corpus/',root),{recursive:true});fs.writeFileSync(new URL('isolated-corpus/bundle.json.tmp',root),JSON.stringify({sources:[...documents.values()],passages:[...texts].map(([hash,body])=>({hash,body})),citations:occurrences}));fs.renameSync(new URL('isolated-corpus/bundle.json.tmp',root),new URL('isolated-corpus/bundle.json',root));fs.writeFileSync(new URL('isolated-corpus/measurement.json',root),JSON.stringify(report,null,2));console.log(JSON.stringify(report));await db.close();
