// Public pinned documentation only; no code execution, Supabase or model calls.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const root = new URL('./wpilib-reference/', import.meta.url);
fs.mkdirSync(root,{recursive:true});
const inventory=JSON.parse(fs.readFileSync(new URL('./document-source-census-20260920.json',import.meta.url),'utf8')).wpilib;
if(inventory.truncated || !/^[a-f0-9]{40}$/.test(inventory.sha))throw new Error('Complete pinned inventory required');
const paths=inventory.paths.filter(p=>p.startsWith('source/docs/')&&!p.includes('..')&&!/(^|\/)index\.(rst|md)$/.test(p)&&/\.(rst|md)$/.test(p));
const manifestPath=new URL('manifest.json',root);
const manifest=fs.existsSync(manifestPath)?JSON.parse(fs.readFileSync(manifestPath,'utf8')):[];
const save=()=>{fs.writeFileSync(new URL('manifest.json.tmp',root),JSON.stringify(manifest,null,2));fs.renameSync(new URL('manifest.json.tmp',root),manifestPath);};
let completed=0;
for(const path of paths){
 if(manifest.some(m=>m.path===path&&m.commit===inventory.sha&&m.status==='collected'))continue;
 const url=`https://raw.githubusercontent.com/wpilibsuite/wpilib-docs/${inventory.sha}/${path}`;
 const row={path,commit:inventory.sha,url,sourceUrl:`https://github.com/wpilibsuite/wpilib-docs/blob/${inventory.sha}/${path}`,retrievedAt:new Date().toISOString(),status:'pending'};
 try{
  const response=await fetch(url,{signal:AbortSignal.timeout(30000),headers:{'User-Agent':'G3-6740-ReadOnly-Corpus-Collection/1.0'}});
  row.httpStatus=response.status;
  if(!response.ok)throw new Error('HTTP '+response.status);
  const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length>1_000_000)throw new Error('Documentation file exceeds 1 MB limit');
  const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  if(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffd]/.test(text))throw new Error('Invalid text characters');
  row.sha256=createHash('sha256').update(bytes).digest('hex');row.bytes=bytes.length;row.file=row.sha256+'.txt';row.status='collected';
  fs.writeFileSync(new URL(row.file,root),bytes);
 }catch(error){row.status=row.httpStatus===404?'unavailable':'blocked';row.error=error.message;}
 const old=manifest.findIndex(m=>m.path===path&&m.commit===inventory.sha);if(old>=0)manifest[old]=row;else manifest.push(row);save();
 if(row.status==='blocked'){console.log({path,error:row.error});break;}
 completed++;if(completed%25===0)console.log({completed,total:paths.length});
 await new Promise(resolve=>setTimeout(resolve,1100));
}
console.log({completed,statuses:manifest.reduce((counts,m)=>(counts[m.status]=(counts[m.status]||0)+1,counts),{})});
