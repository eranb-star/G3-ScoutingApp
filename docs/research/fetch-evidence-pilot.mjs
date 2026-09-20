import fs from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('./evidence-pilot/',import.meta.url);fs.mkdirSync(root,{recursive:true});
const starter=JSON.parse(fs.readFileSync(new URL('./robot-research-starter.json',import.meta.url)));
const archive=JSON.parse(fs.readFileSync(new URL('./document-source-census-20260920.json',import.meta.url)));
const sources=starter.robots.map(r=>({url:r.url,team:r.team,season:r.season,kind:'team-release',title:r.sourceTitle}));
for(const year of [2017,2023,2026]){const l=archive.archive.years.find(x=>x.year===year).links.find(x=>/manual.*\.pdf/i.test(x.url));if(l)sources.push({url:l.url,season:year,kind:'official-manual',title:l.label});}
for(const path of ['controllers/pidcontroller','introduction/introduction-to-pid'])sources.push({url:`https://docs.wpilib.org/en/stable/docs/software/advanced-controls/${path}.html`,season:null,kind:'engineering-reference',title:path});
sources.push({url:'https://docs.wpilib.org/en/stable/docs/software/kinematics-and-odometry/swerve-drive-kinematics.html',season:null,kind:'engineering-reference',title:'Swerve kinematics'});
const binderOnly=process.argv.includes('--binder');
if(binderOnly)sources.splice(0,sources.length,{url:'https://drive.google.com/uc?export=download&id=1-yNlq7gerI79VgLJUZdBnDqW3_aR58sh',team:2910,season:2024,kind:'technical-binder',title:'2910 2024 technical binder linked by team release'});
const manifest=binderOnly?JSON.parse(fs.readFileSync(new URL('manifest.json',root))):[];
const firstId=manifest.length+1;
for(const [i,source]of sources.entries()){
 const row={id:firstId+i,...source,retrievedAt:new Date().toISOString(),reviewStatus:'unreviewed'};
 try{const r=await fetch(source.url,{signal:AbortSignal.timeout(40000),headers:{'User-Agent':'G3-6740-ReadOnly-Evidence-Pilot/1.0'}});row.status=r.status;row.finalUrl=r.url;row.contentType=r.headers.get('content-type');row.lastModified=r.headers.get('last-modified');row.etag=r.headers.get('etag');if(r.ok){const b=Buffer.from(await r.arrayBuffer());row.bytes=b.length;row.sha256=createHash('sha256').update(b).digest('hex');row.file=`${row.id}.${b.subarray(0,5).toString()==='%PDF-'?'pdf':'html'}`;fs.writeFileSync(new URL(row.file,root),b);}}
 catch(e){row.error=e.message;}manifest.push(row);fs.writeFileSync(new URL('manifest.json',root),JSON.stringify(manifest,null,2));console.log(JSON.stringify({id:row.id,status:row.status,bytes:row.bytes,error:row.error}));
}
