import fs from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('./expanded-study/',import.meta.url);fs.mkdirSync(root,{recursive:true});
if(process.argv.includes('--binder')){
 const url='https://whsrobotics.org/2023techbinder.pdf';const r=await fetch(url,{signal:AbortSignal.timeout(45000)});if(!r.ok)throw new Error(`HTTP ${r.status}`);const b=Buffer.from(await r.arrayBuffer());if(b.subarray(0,5).toString()!=='%PDF-')throw new Error('Not a PDF');fs.writeFileSync(new URL('1757-2023-binder.pdf',root),b);const metadata={url,team:1757,year:2023,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex'),checkedAt:new Date().toISOString(),status:r.status};fs.writeFileSync(new URL('binder-manifest.json',root),JSON.stringify(metadata,null,2));console.log(metadata);
}else if(process.argv.includes('--complete-posts')){
 const rows=JSON.parse(fs.readFileSync(new URL('thread-manifest.json',root)));let requests=0;let stop=false;const ledger=[];
 for(const row of rows){
  if(!row.file||stop)continue;const j=JSON.parse(fs.readFileSync(new URL(row.file,root)));const posts=new Map(j.post_stream.posts.map(p=>[p.id,p]));const missing=j.post_stream.stream.filter(id=>!posts.has(id));
  for(let i=0;i<missing.length;i+=20){
   if(requests>=160){stop=true;break;}
   const query=new URLSearchParams();for(const id of missing.slice(i,i+20))query.append('post_ids[]',id);
   const url=`https://www.chiefdelphi.com/t/${j.id}/posts.json?${query}`;requests++;
   try{const r=await fetch(url,{signal:AbortSignal.timeout(30000)});ledger.push({url,status:r.status,checkedAt:new Date().toISOString()});if(!r.ok){stop=true;break;}const b=await r.json();const batch=b.post_stream?.posts||[];if(!batch.length){stop=true;break;}for(const p of batch)posts.set(p.id,p);}
   catch(e){ledger.push({url,error:e.message});stop=true;break;}
  }
  const result={team:row.team,year:row.year,band:row.band,rank:row.rank,url:row.url,expected:j.post_stream.stream.length,posts:[...posts.values()].sort((a,b)=>a.post_number-b.post_number)};
  fs.writeFileSync(new URL(`complete-${row.year}-${row.team}.json`,root),JSON.stringify(result));console.log({team:row.team,year:row.year,expected:result.expected,got:posts.size,requests,stop});
  fs.writeFileSync(new URL('post-fetch-ledger.json',root),JSON.stringify(ledger,null,2));
 }
}else if(process.argv.includes('--threads')){
 const inventory=JSON.parse(fs.readFileSync(new URL('inventory.json',root)));const results=[];
 for(const s of inventory.filter(s=>s.rank)){
  const url=s.url+'.json';const row={...s,requestedUrl:url,checkedAt:new Date().toISOString()};
  try{const r=await fetch(url,{signal:AbortSignal.timeout(30000)});row.status=r.status;
   if(r.ok){const t=await r.text();row.bytes=Buffer.byteLength(t);row.sha256=createHash('sha256').update(t).digest('hex');const j=JSON.parse(t);row.postsCount=j.posts_count;row.streamCount=j.post_stream?.stream?.length;row.returnedPosts=j.post_stream?.posts?.length;row.file=`thread-${s.year}-${s.team}.json`;fs.writeFileSync(new URL(row.file,root),t);}
  }catch(e){row.error=e.message;}
  results.push(row);fs.writeFileSync(new URL('thread-manifest.json',root),JSON.stringify(results,null,2));console.log({year:row.year,team:row.team,band:row.band,status:row.status,posts:row.postsCount,returned:row.returnedPosts,error:row.error});
  if(row.status===429||row.status===403)break;
 }
}else{
const sources=[{year:2023,url:'https://www.chiefdelphi.com/t/the-open-alliance-2023-highlights/421994'},{year:2022,url:'https://www.chiefdelphi.com/t/the-open-alliance-is-officially-open-to-all-teams/397951/21'}];
for(const s of sources){const r=await fetch(s.url,{signal:AbortSignal.timeout(45000)});const text=await r.text();fs.writeFileSync(new URL(`directory-${s.year}.html`,root),text);s.status=r.status;s.bytes=Buffer.byteLength(text);s.sha256=createHash('sha256').update(text).digest('hex');console.log({year:s.year,status:r.status,bytes:s.bytes});}
fs.writeFileSync(new URL('directories.json',root),JSON.stringify({checkedAt:new Date().toISOString(),sources},null,2));
}
