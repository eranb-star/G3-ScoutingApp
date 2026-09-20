// Offline, reproducible SQL transport. No credential or network access.
import fs from 'node:fs';
import http from 'node:http';
import {createHash} from 'node:crypto';
const base=new URL('./',import.meta.url),out=new URL('../staging/corpus-release.local/',base);
fs.mkdirSync(out,{recursive:true});
const raw=fs.readFileSync(new URL('isolated-corpus/bundle.json',base));
const bundle=JSON.parse(raw),generation='corpus-'+createHash('sha256').update(raw).digest('hex').slice(0,20);
const literal=x=>"'"+JSON.stringify(x).replaceAll("'","''")+"'::jsonb";
const sources=bundle.sources.map(s=>{
 const url=new URL(s.url),years=[...new Set(s.candidateAssociations?.map(a=>a.year)||[s.documentSeason??s.sourceContextSeason??s.citingSeason].filter(Boolean))];
 const teams=[...new Set(s.candidateAssociations?.map(a=>a.team)||[s.publisherTeam??s.citingTeam].filter(Boolean))];
 const official=['official-manual','official-technical-doc'].includes(s.kind)||(s.kind==='engineering-reference'&&['docs.wpilib.org','frc-docs.readthedocs.io'].includes(url.hostname));
 return {generation,id:s.id,url:s.url,version_hash:s.versionHash,title:s.title||(url.pathname.startsWith('/t/')?url.pathname.split('/')[2].replaceAll('-',' '):url.hostname),seasons:years,teams,source_class:official?'official':['forum-thread','team-release','technical-binder'].includes(s.kind)||s.publisherTeam?'team':'other',scope:s.scope??null,metadata:s};
});
const byId=new Map(sources.map(s=>[s.id,s]));
const passages=bundle.passages.map(p=>({generation,...p}));
const citations=bundle.citations.map((c,i)=>({generation,id:i+1,source:c.source,hash:c.hash,url:c.locator.postUrl||byId.get(c.source).url+(c.locator.page?'#page='+c.locator.page:''),locator:c.locator}));
const batches=[];
batches.push(`insert into public.frc_corpus_generations(id,expected_sources,expected_passages,expected_citations,manifest) values('${generation}',${sources.length},${passages.length},${citations.length},${literal({bundleSha256:createHash('sha256').update(raw).digest('hex'),coverage:'Incomplete; source associations are candidates, not verified robot facts.',seasons:'2017–2026 plus general references'})}) on conflict do nothing;`);
function batch(table,rows,columns,record){let chunk=[],size=0;const flush=()=>{if(!chunk.length)return;batches.push(`insert into public.${table}(${columns}) select ${columns} from jsonb_to_recordset(${literal(chunk)}) as r(${record}) on conflict do nothing;`);chunk=[];size=0;};for(const row of rows){const n=Buffer.byteLength(JSON.stringify(row));if(size+n>700000)flush();chunk.push(row);size+=n;}flush();}
batch('frc_corpus_sources',sources,'generation,id,url,version_hash,title,seasons,teams,source_class,scope,metadata','generation text,id integer,url text,version_hash text,title text,seasons integer[],teams integer[],source_class text,scope text,metadata jsonb');
batch('frc_corpus_passages',passages,'generation,hash,body','generation text,hash text,body text');
batch('frc_corpus_citations',citations,'generation,id,source,hash,url,locator','generation text,id integer,source integer,hash text,url text,locator jsonb');
batches.push(`select public.activate_frc_corpus('${generation}'); analyze public.frc_corpus_passages; analyze public.frc_corpus_citations; analyze public.frc_corpus_sources; select id,status,expected_sources,expected_passages,expected_citations from public.frc_corpus_generations where id='${generation}';`);
batches.forEach((sql,i)=>fs.writeFileSync(new URL(`${i}.sql`,out),sql));
// Dashboard bulk import uses the same canonical records as the SQL batches.
const csvValue=v=>'"'+String(v==null?'':Array.isArray(v)?'{'+v.join(',')+'}':typeof v==='object'?JSON.stringify(v):v).replaceAll('"','""')+'"';
for(const [name,rows] of Object.entries({sources,passages,citations})){
 const columns=Object.keys(rows[0]);
 fs.writeFileSync(new URL(`${name}.csv`,out),[columns.join(','),...rows.map(row=>columns.map(c=>csvValue(row[c])).join(','))].join('\n'));
}
if(process.env.CORPUS_IMPORTED_THROUGH){
 const through=Number(process.env.CORPUS_IMPORTED_THROUGH);
 if(!Number.isInteger(through)||through<0||through>=batches.length-1)throw new Error('Invalid checkpoint');
 const imported=new Set();
 for(const sql of batches.slice(0,through+1))if(sql.startsWith('insert into public.frc_corpus_passages')){
  const json=sql.split("jsonb_to_recordset('")[1].split("'::jsonb)")[0].replaceAll("''","'");
  for(const row of JSON.parse(json))imported.add(row.hash);
 }
 const remaining=passages.filter(p=>!imported.has(p.hash));
 fs.writeFileSync(new URL('passages-remaining.csv',out),['generation,hash,body',...remaining.map(row=>[row.generation,row.hash,row.body].map(csvValue).join(','))].join('\n'));
 console.log(JSON.stringify({checkpoint:through,importedPassages:imported.size,remainingPassages:remaining.length}));
}
fs.writeFileSync(new URL('manifest.json',out),JSON.stringify({generation,batches:batches.length,sources:sources.length,passages:passages.length,citations:citations.length},null,2));
console.log(JSON.stringify({generation,batches:batches.length,sources:sources.length,passages:passages.length,citations:citations.length}));
export {batches,generation};
if(process.argv.includes('--serve'))http.createServer((req,res)=>{
 if(req.url==='/repair'){
  const sql=fs.readFileSync(new URL('repair.sql',out),'utf8');res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<h1>Canonical passage repair</h1><textarea aria-label="Release source">'+sql.replaceAll('&','&amp;').replaceAll('<','&lt;')+'</textarea>');return;
 }
 if(req.url==='/schema'){
  const backend=new URL('../../backend/supabase/',base);
  const sql=['knowledge_source_checks_20260920.sql','robot_research_20260920.sql','knowledge_corpus_20260921.sql','knowledge_team_search_20260921.sql'].map(f=>fs.readFileSync(new URL(f,backend),'utf8')).join('\n')+'\n'+fs.readFileSync(new URL('robot_research_starter_20260920.sql',backend),'utf8').split('\n').filter(l=>l.startsWith('insert into public.frc_research_topics')).join('\n');
  res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<h1>Corpus schema</h1><textarea aria-label="Release source">'+sql.replaceAll('&','&amp;').replaceAll('<','&lt;')+'</textarea>');return;
 }
 const index=Number(req.url.slice(1));if(!Number.isInteger(index)||index<0||index>=batches.length){res.writeHead(404);res.end();return;}
 res.setHeader('Content-Type','text/html; charset=utf-8');res.end(`<h1>Corpus batch ${index+1} / ${batches.length}</h1><textarea aria-label="Release source">${batches[index].replaceAll('&','&amp;').replaceAll('<','&lt;')}</textarea>`);
}).listen(4234,'127.0.0.1',()=>console.log('Offline release transport http://127.0.0.1:4234/0'));
