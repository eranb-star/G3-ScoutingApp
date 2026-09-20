// Offline integrity checks; safe against atomic collector checkpoints.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const root=new URL('./full-collection/',import.meta.url);
const read=name=>JSON.parse(fs.readFileSync(new URL(name,root),'utf8'));
const jobs=read('jobs.json'),scope=read('scope.json');
assert.equal(new Set(jobs.map(j=>j.topic)).size,jobs.length,'A topic must have only one collection job');
const selected=new Map(scope.teamSeasons.map(r=>[`${r.year}:${r.team}`,r]));
for(const season of scope.seasons){
 const rows=scope.teamSeasons.filter(r=>r.year===season.year);
 assert.equal(rows.length,season.selected);
 if(season.status==='ranked-snapshot'){assert.equal(rows.length,500);assert.equal(new Set(rows.map(r=>r.team)).size,500);}
}
let complete=0,posts=0;
for(const job of jobs){
 assert.match(job.url,/^https:\/\/www\.chiefdelphi\.com\/t\/[^/]+\/\d+$/);
 for(const a of job.associations){
  assert.equal(a.confidence,'title-candidate-not-verified');
  assert.ok(a.year>=2017&&a.year<=2026);
  const target=selected.get(`${a.year}:${a.team}`);
  if(a.selection==='ranked-snapshot'){assert.ok(target);assert.equal(a.rank,target.rank);}
  else assert.equal(a.rank,null,'Supplemental sources must not invent a ranking');
 }
 if(job.status!=='collected')continue;
 const topic=read(`topic-${job.topic}.json`);
 assert.equal(new Set(topic.posts.map(p=>p.id)).size,topic.expected,job.url+' post completeness');
 assert.equal(topic.posts.length,job.posts);
 assert.ok(topic.posts.every(p=>Number.isInteger(p.post_number)&&p.post_number>0));
 complete++;posts+=topic.posts.length;
}
const ledger=read('requests.json');
const succeeded=ledger.filter(r=>r.status===200&&!r.error);
assert.equal(new Set(succeeded.map(r=>r.url)).size,succeeded.length,'Resume must reuse successful cached requests');
console.log(JSON.stringify({passed:true,completeThreads:complete,posts,successfulRequests:succeeded.length,duplicateSuccessfulFetches:0}));
