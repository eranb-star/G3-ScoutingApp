// Local, resumable public corpus collection. No Supabase or LLM calls.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {titleCandidates} from './source-title-candidates.mjs';
const root=new URL('./full-collection/',import.meta.url);fs.mkdirSync(root,{recursive:true});
const command=process.argv[2]||'status';
if(!['status','queue','collect','categories','discover'].includes(command))throw new Error('Unknown collection command');
if(command!=='status'){
 const lock=new URL('collector.lock',root);
 if(fs.existsSync(lock)){
  const owner=JSON.parse(fs.readFileSync(lock,'utf8'));
  try{process.kill(owner.pid,0);throw new Error(`Collection process ${owner.pid} is already running`);}catch(error){if(error.code!=='ESRCH')throw error;fs.unlinkSync(lock);}
 }
 fs.writeFileSync(lock,JSON.stringify({pid:process.pid,command,startedAt:new Date().toISOString()}),{flag:'wx'});
 process.on('exit',()=>{try{fs.unlinkSync(lock);}catch{}});
 process.once('SIGINT',()=>process.exit(130));process.once('SIGTERM',()=>process.exit(143));
}
const read=(p,fallback)=>fs.existsSync(new URL(p,root))?JSON.parse(fs.readFileSync(new URL(p,root),'utf8')):fallback;
const save=(p,data)=>{const url=new URL(p,root),tmp=new URL(p+'.tmp',root);fs.writeFileSync(tmp,JSON.stringify(data,null,2));fs.renameSync(tmp,url);};
const selections=JSON.parse(fs.readFileSync(new URL('./ranked-selection-analysis.json',import.meta.url)));
const scope=read('scope.json',{createdAt:new Date().toISOString(),target:500,seasons:[],teamSeasons:[]});
if(!scope.teamSeasons.length){for(let year=2017;year<=2026;year++){const s=selections.years.find(s=>s.year===year);const usable=s?.top500.length===500;scope.seasons.push({year,status:usable?'ranked-snapshot':year===2021?'unranked-exception':'ranking-unavailable',selected:usable?500:0,rankingSource:usable?'Statbotics archive '+selections.archiveCommit:null});if(usable)s.top500.forEach((team,i)=>scope.teamSeasons.push({team,year,rank:i+1,priority:i<300?1:2,status:'awaiting-source-discovery'}));}save('scope.json',scope);}
const ledger=read('requests.json',[]);let last=0;
async function get(url){const cached=read('cache-index.json',{});if(cached[url])return JSON.parse(fs.readFileSync(new URL(cached[url],root),'utf8'));const delay=1100-(Date.now()-last);if(delay>0)await new Promise(r=>setTimeout(r,delay));last=Date.now();const row={url,at:new Date().toISOString()};try{const r=await fetch(url,{signal:AbortSignal.timeout(30000),headers:{'User-Agent':'G3-6740-ReadOnly-Corpus-Collection/1.0'}});row.status=r.status;if(!r.ok)throw new Error('HTTP '+r.status);const text=await r.text();if(text.length>10_000_000)throw new Error('Response exceeds 10 MB limit');const data=JSON.parse(text);const file='response-'+createHash('sha256').update(url).digest('hex')+'.json';fs.writeFileSync(new URL(file,root),text);cached[url]=file;save('cache-index.json',cached);return data;}catch(e){row.error=e.message;throw e;}finally{ledger.push(row);save('requests.json',ledger);}}
if(command==='queue'){
 const topics=read('topics.json',[]),jobs=read('jobs.json',[]);const selected=new Map(scope.teamSeasons.map(r=>[`${r.year}:${r.team}`,r]));
 const census=JSON.parse(fs.readFileSync(new URL('./frc-team-directory-census-20260920.json',import.meta.url),'utf8'));
 const unranked=new Map(census.years.filter(y=>scope.seasons.find(s=>s.year===y.year)?.status!=='ranked-snapshot').map(y=>[y.year,new Set(y.teams)]));
 for(const t of topics){
  const {years,teams:teamCandidates}=titleCandidates(t.title);
  const associations=[];for(const year of years)for(const team of teamCandidates){const s=selected.get(`${year}:${team}`);if(s)associations.push({team,year,rank:s.rank,priority:s.priority,selection:'ranked-snapshot',confidence:'title-candidate-not-verified'});else if(unranked.get(year)?.has(team))associations.push({team,year,rank:null,priority:3,selection:year===2021?'unranked-season':'ranking-pending',confidence:'title-candidate-not-verified'});}
  if(!associations.length){const prior=jobs.find(j=>j.topic===t.id);if(prior){prior.associations=[];prior.discoveryNote='No current scope match after title parser correction; retained for audit.';}continue;}
  const prior=jobs.find(j=>j.topic===t.id);if(prior){prior.associations=associations;prior.priority=Math.min(...associations.map(x=>x.priority));continue;}
  jobs.push({topic:t.id,url:`https://www.chiefdelphi.com/t/${t.slug}/${t.id}`,title:t.title,associations,status:'pending',priority:Math.min(...associations.map(x=>x.priority))});
 }
 jobs.sort((a,b)=>a.priority-b.priority||a.topic-b.topic);save('jobs.json',jobs);
 const existing=new Map();for(const file of fs.readdirSync(new URL('./expanded-study/',import.meta.url)).filter(n=>/^complete-/.test(n))){const d=JSON.parse(fs.readFileSync(new URL('./expanded-study/'+file,import.meta.url)));const id=Number(d.url.split('/').at(-1));existing.set(id,d);}
 for(const j of jobs)if(existing.has(j.topic)&&j.status==='pending'){const d=existing.get(j.topic);save(`topic-${j.topic}.json`,{...d,id:j.topic,posts:d.posts,expected:d.expected});j.status=d.posts.length===d.expected?'collected':'partial';j.reused=true;j.posts=d.posts.length;}
 save('jobs.json',jobs);console.log({jobs:jobs.length,pending:jobs.filter(j=>j.status==='pending').length,reused:jobs.filter(j=>j.reused).length,teamSeasonsWithCandidates:new Set(jobs.flatMap(j=>j.associations.map(a=>`${a.year}:${a.team}`))).size});
}else if(command==='collect'){
 const jobs=read('jobs.json',[]);const max=Number(process.argv[3]||100);let completed=0;const candidates=jobs.filter(j=>['pending','partial'].includes(j.status));
 for(const job of candidates.slice(0,max)){
  try{
   const topic=await get(job.url+'.json');const stored=read(`topic-${job.topic}.json`,null);const posts=new Map([...(stored?.posts||[]),...(topic.post_stream?.posts||[])].map(p=>[p.id,p]));const ids=topic.post_stream?.stream;if(!Array.isArray(ids))throw new Error('Missing post stream');
   const missing=ids.filter(id=>!posts.has(id));for(let i=0;i<missing.length;i+=20){const q=new URLSearchParams();missing.slice(i,i+20).forEach(id=>q.append('post_ids[]',id));const page=await get(`https://www.chiefdelphi.com/t/${job.topic}/posts.json?${q}`);for(const p of page.post_stream?.posts||[])posts.set(p.id,p);save(`topic-${job.topic}.json`,{id:job.topic,title:topic.title,url:job.url,expected:ids.length,posts:[...posts.values()]});}
   save(`topic-${job.topic}.json`,{id:job.topic,title:topic.title,url:job.url,expected:ids.length,posts:[...posts.values()]});job.posts=posts.size;job.expected=ids.length;job.status=ids.every(id=>posts.has(id))?'collected':'partial';job.checkedAt=new Date().toISOString();completed++;save('jobs.json',jobs);if(completed%10===0)console.log({completed,remaining:jobs.filter(j=>j.status==='pending').length});
  }catch(e){job.status=e.message==='HTTP 404'?'unavailable':'blocked';job.error=e.message;save('jobs.json',jobs);console.log({topic:job.topic,error:e.message});if(job.status!=='unavailable')break;}
 }
 console.log({completed,statuses:jobs.reduce((a,j)=>(a[j.status]=(a[j.status]||0)+1,a),{})});
}else if(command==='categories'){
 const data=await get('https://www.chiefdelphi.com/categories.json');save('categories.json',data);console.log(JSON.stringify(data.category_list?.categories?.map(c=>({id:c.id,name:c.name,slug:c.slug,subcategory_ids:c.subcategory_ids}))));
}else if(command==='discover'){
 const id=Number(process.argv[3]);if(!Number.isInteger(id)||id<1)throw new Error('Provide known public category ID');const max=Number(process.argv[4]||30);const topics=read('topics.json',[]);const progress=read('discovery-progress.json',{});let page=progress[id]?.nextPage||0;
 const beforeScope=data=>data?.topic_list?.topics?.length>0&&data.topic_list.topics.every(t=>t.created_at&&t.last_posted_at&&t.bumped_at&&[t.created_at,t.last_posted_at,t.bumped_at].every(d=>d<'2017-01-01'));
 if(page>0){const cached=read('cache-index.json',{})[`https://www.chiefdelphi.com/c/${id}.json?page=${page-1}`];if(cached&&beforeScope(read(cached,null))){progress[id]={nextPage:page,status:'scope-boundary',note:'Latest-activity listing reached a full page with created, posted and bumped dates before 2017.'};save('discovery-progress.json',progress);console.log(progress[id]);process.exit(0);}}
 for(let n=0;n<max;n++,page++){
  let data;try{data=await get(`https://www.chiefdelphi.com/c/${id}.json?page=${page}`);}catch(e){progress[id]={nextPage:page,status:'blocked',reason:e.message};save('discovery-progress.json',progress);console.log({category:id,page,error:e.message});break;}
  const rows=data.topic_list?.topics;if(!Array.isArray(rows))throw new Error('Unexpected category response');for(const t of rows)if(!topics.some(x=>x.id===t.id))topics.push({id:t.id,title:t.title,slug:t.slug,created_at:t.created_at,posts_count:t.posts_count,category_id:t.category_id});save('topics.json',topics);
  progress[id]={nextPage:page+1,status:rows.length?'running':'exhausted'};save('discovery-progress.json',progress);console.log({category:id,page,returned:rows.length,topics:topics.length});if(!rows.length||!data.topic_list.more_topics_url){progress[id].status='exhausted';save('discovery-progress.json',progress);break;}
  if(beforeScope(data)){progress[id].status='scope-boundary';progress[id].note='All activity dates on this page precede 2017.';save('discovery-progress.json',progress);break;}
 }
}else if(command==='status')console.log({teamSeasons:scope.teamSeasons.length,seasons:scope.seasons,requests:ledger.length,topics:read('topics.json',[]).length,progress:read('discovery-progress.json',{})});
