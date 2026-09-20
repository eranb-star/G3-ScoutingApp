// Read-only public source collection. No database credentials or production writes.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('./linked-documents/',import.meta.url);fs.mkdirSync(root,{recursive:true});
const sourceRoot=new URL('./expanded-study/',import.meta.url);
const map=new Map();
for(const file of fs.readdirSync(sourceRoot).filter(x=>/^complete-.*\.json$/.test(x))){
 const thread=JSON.parse(fs.readFileSync(new URL(file,sourceRoot)));
 for(const post of thread.posts)for(const match of post.cooked.matchAll(/href="(https?:\/\/[^"<>]+)"/g)){
  const url=match[1].replaceAll('&amp;','&');let parsed;try{parsed=new URL(url);}catch{continue;}
  const key=parsed.href;const row=map.get(key)||{url:key,kind:/\.pdf$/i.test(parsed.pathname)?'pdf':/\.(png|jpe?g|gif|webp|svg)$/i.test(parsed.pathname)?'image':/onshape|grabcad|autodesk/.test(parsed.hostname)?'cad':/youtube|youtu\.be|vimeo/.test(parsed.hostname)?'video':/github|gitlab/.test(parsed.hostname)?'code-or-documentation':'other',publisherTeam:null,documentSeason:null,reviewStatus:'unreviewed',occurrences:[]};
  const source={citingTeam:thread.team,citingSeason:thread.year,rankBand:thread.band,postId:post.id,postUrl:thread.url+'/'+post.post_number,postedAt:post.created_at};
  if(!row.occurrences.some(x=>x.postId===post.id))row.occurrences.push(source);map.set(key,row);
 }
}
const inventory=[...map.values()];fs.writeFileSync(new URL('inventory.json',root),JSON.stringify(inventory,null,2));
const chosen=inventory.filter(x=>x.kind==='pdf'&&/Camera_Latency_Whitepaper|Test_Bench_Whitepaper|Vision_Whitepaper|TR-X-Notebook|c4fd84c75983c0cd32572ca0f4ea36f3d4f962e5|qzj4k2LyBs7rLxAem0YajNIlStH|ES17-12|Web-WCP-0199|Battery%20Cart/.test(x.url));
const manifestPath=new URL('manifest.json',root);const manifest=fs.existsSync(manifestPath)?JSON.parse(fs.readFileSync(manifestPath)):[];
for(const candidate of chosen){
 if(manifest.some(x=>x.url===candidate.url&&(x.status||x.file||!process.argv.includes('--retry-network'))))continue;
 const row={...candidate,checkedAt:new Date().toISOString()};
 try{
  const r=await fetch(row.url,{signal:AbortSignal.timeout(45000),headers:{'User-Agent':'G3-6740-ReadOnly-Evidence-Collection/1.0'}});row.status=r.status;row.finalUrl=r.url;row.contentType=r.headers.get('content-type');row.etag=r.headers.get('etag');row.lastModified=r.headers.get('last-modified');
  if(r.ok){let length=0;const parts=[];for await(const part of r.body){length+=part.length;if(length>25_000_000)throw new Error('Document exceeds 25 MB collection limit');parts.push(part);}const b=Buffer.concat(parts);row.bytes=b.length;if(b.subarray(0,5).toString()!=='%PDF-'){row.excluded='Response is not a PDF';}else{row.sha256=createHash('sha256').update(b).digest('hex');row.file=row.sha256+'.pdf';if(!fs.existsSync(new URL(row.file,root)))fs.writeFileSync(new URL(row.file,root),b);}}
 }catch(e){row.error=e.message;}
 manifest.push(row);fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2));console.log({url:row.url,status:row.status,bytes:row.bytes,accepted:!!row.file,error:row.error});
 if(row.status===429)break;
}
console.log({uniqueLinks:inventory.length,byType:inventory.reduce((a,x)=>(a[x.kind]=(a[x.kind]||0)+1,a),{}),attempts:manifest.length});
