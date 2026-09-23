import {createRequire} from 'node:module';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {pathToFileURL} from 'node:url';
const req=createRequire(import.meta.url),{build}=createRequire(req.resolve('vite'))('esbuild');
const result=await build({stdin:{contents:`
import assert from 'node:assert/strict';
import {createPhysicalDrive} from './src/lib/physicalDrive';import {DEFAULT_CONCEPT} from './src/lib/conceptTwin';import {DEFAULT_INTAKE} from './src/lib/intake';import {DEFAULT_SHOOTER,HUB_ALLIANCES} from './src/lib/shooter';
assert.deepEqual(HUB_ALLIANCES,['red','blue']);
const idle={vx:0,vy:0,omega:0};
const d=await createPhysicalDrive(DEFAULT_CONCEPT);
function conserved(){const l=d.fuel.ledger();assert.equal(l.field+l.stored+l.hub+l.outposts+l.outOfPlay,l.total);const ids=[...d.fuel.balls.keys(),...d.fuel.stored,...d.fuel.transit.map(t=>t.id),...d.fuel.outposts.flat(),...d.fuel.outOfPlay];assert.equal(new Set(ids).size,l.total,'each ball has exactly one location');}
d.fuel.reset();assert.equal(d.fuel.balls.size,448);assert.equal(d.fuel.collected,8);assert.deepEqual(d.fuel.outposts.map(p=>p.length),[24,24]);conserved();
const resting=d.fuel.snapshot();const begun=performance.now();for(let i=0;i<120;i++){d.step(idle);conserved();}assert.ok(d.fuel.snapshot().every(b=>Math.hypot(b.x-resting[b.id].x,b.y-resting[b.id].y,b.z-resting[b.id].z)<.001),'starting balls remain stationary without contact');console.log('504-ball physics ms:',Math.round(performance.now()-begun));
d.fuel.feedOutpost(0);conserved();assert.equal(d.fuel.outposts[0].length,23);
function single(y=0){d.reset(-6,y);d.fuel.reset([]);d.fuel.total=1;d.fuel.stored.push(0);}
function trajectory(){single();const track=[];for(let i=0;i<38;i++){d.step(idle,DEFAULT_INTAKE,{...DEFAULT_SHOOTER,on:true});track.push(d.fuel.snapshot()[0]);}return track;}
const first=trajectory(),second=trajectory();let delta=0;for(let i=0;i<first.length;i++)delta=Math.max(delta,Math.hypot(first[i].x-second[i].x,first[i].y-second[i].y,first[i].z-second[i].z));console.log('reset shot max delta',delta);assert.ok(delta<.005,'repeat reset shot trajectory agrees within 5mm');
single();let sawHub=false;
for(let i=0;i<210;i++){d.step(idle,DEFAULT_INTAKE,{...DEFAULT_SHOOTER,on:true});sawHub ||= d.fuel.transit.length>0;conserved();}
console.log('shot result',d.fuel.scores,d.fuel.snapshot());assert.equal(d.fuel.shots,1);assert.equal(d.fuel.collected,0);assert.equal(d.fuel.scores[0],1,'shot enters red hub');assert.ok(sawHub,'ball is processed inside hub');assert.ok(d.fuel.snapshot()[0].x>-3.0,'scored ball exits toward neutral');
single(1.2);for(let i=0;i<180;i++){d.step(idle,DEFAULT_INTAKE,{...DEFAULT_SHOOTER,on:true});conserved();}assert.equal(d.fuel.scores[0]+d.fuel.scores[1],0,'miss does not score');assert.equal(d.fuel.balls.size,1,'miss remains physical');assert.ok(d.fuel.snapshot()[0].x>-5,'miss travels');
d.reset(-6,0);d.fuel.reset([]);d.fuel.total=1;d.fuel.spawn(0,{x:-3.644+.8,y:0,z:2.1});for(let i=0;i<90;i++){d.step(idle);conserved();}assert.equal(d.fuel.scores[0],0,'outside opening is not a goal');
d.fuel.reset([]);for(let i=0;i<60;i++)d.step(idle,DEFAULT_INTAKE,{...DEFAULT_SHOOTER,on:true});assert.equal(d.fuel.shots,0,'empty storage cannot create balls');
d.fuel.total=1;d.fuel.spawn(0,{x:9,y:0,z:.3});d.step(idle);assert.equal(d.fuel.outOfPlay.length,1);d.fuel.recoverOutOfPlay();conserved();assert.equal(d.fuel.outposts[0].length,1);
for(const lanes of [1,2,3])for(const yaw of [0,180]){
 d.reset(-6,0);d.fuel.reset([]);d.fuel.total=8;d.fuel.stored.push(...Array.from({length:8},(_,i)=>i));
 const shot={...DEFAULT_SHOOTER,on:true,lanes,yaw};
 d.step(idle,DEFAULT_INTAKE,shot);assert.equal(d.fuel.shots,lanes);assert.equal(d.fuel.collected,8-lanes);conserved();
 const balls=d.fuel.snapshot();for(let i=1;i<balls.length;i++)assert.ok(Math.hypot(balls[i].x-balls[i-1].x,balls[i].y-balls[i-1].y)>.15,'parallel balls do not overlap');
 assert.equal(new Set(d.fuel.visualEvents.filter(e=>e.kind==='shot').map(e=>e.tick)).size,1,'same-tick volley');
 for(let i=0;i<10;i++)d.step(idle,DEFAULT_INTAKE,shot);assert.equal(d.fuel.shots,lanes,'one cooldown per volley');
 for(let i=0;i<270;i++){d.step(idle,DEFAULT_INTAKE,shot);conserved();}assert.equal(d.fuel.shots,8,'partial final volley conserves balls');assert.equal(d.fuel.collected,0);
}
d.dispose();console.log('PASS: match quantity, unique lifecycle, shooting, scoring, hub return, misses, rim, empty storage and recovery');
`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const file=path.join(os.tmpdir(),'g3-shooting-test.mjs');await fs.writeFile(file,result.outputFiles[0].text);await import(pathToFileURL(file));
