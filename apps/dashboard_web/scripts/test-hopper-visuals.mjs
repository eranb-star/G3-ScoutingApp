import {createRequire} from 'node:module';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {pathToFileURL} from 'node:url';
const req=createRequire(import.meta.url),{build}=createRequire(req.resolve('vite'))('esbuild');
const result=await build({stdin:{contents:String.raw`
import assert from 'node:assert/strict';
import {createPhysicalDrive} from './src/lib/physicalDrive';
import {DEFAULT_CONCEPT,START} from './src/lib/conceptTwin';
import {DEFAULT_INTAKE} from './src/lib/intake';
import {DEFAULT_SHOOTER} from './src/lib/shooter';
import {hopperVisuals,hopperSlot} from './src/lib/hopperVisuals';
const d=await createPhysicalDrive(DEFAULT_CONCEPT),idle={vx:0,vy:0,omega:0};
d.fuel.reset();let p=d.snapshot();assert.equal(hopperVisuals(p,20).stored.length,8);
const preload=[...p.storedIds];p=d.step(idle,DEFAULT_INTAKE,{...DEFAULT_SHOOTER,on:true});
let visuals=hopperVisuals(p,20);assert.equal(visuals.stored.length,7);assert.ok(visuals.field.some(b=>b.id===preload[0]));
assert.equal(new Set([...visuals.stored,...visuals.field].map(b=>b.id)).size,visuals.stored.length+visuals.field.length);
assert.deepEqual(hopperVisuals(p,20),visuals,'paused tick has stable visuals');
for(let i=0;i<20;i++)p=d.step(idle);visuals=hopperVisuals(p,20);assert.deepEqual(visuals.field.find(b=>b.id===preload[0]),{...p.balls.find(b=>b.id===preload[0]),radius:.075});
d.reset(-6,0);d.fuel.reset([{x:-6+DEFAULT_CONCEPT.length/2+.12,y:0}]);
for(let i=0;i<120&&d.fuel.collected===0;i++)p=d.step(idle,{...DEFAULT_INTAKE,on:true});
assert.equal(d.fuel.collected,1);assert.equal(p.fuelVisualEvents[0].kind,'capture');assert.equal(hopperVisuals(p,20).stored.length,1);assert.equal(hopperVisuals(p,20).field.length,0);
for(let i=0;i<30;i++)p=d.step(idle);const slot=hopperSlot(0,20);assert.deepEqual(hopperVisuals(p,20).stored[0],{id:0,...slot});
const epoch=p.fuelVisualEpoch;d.reset();d.fuel.reset();p=d.snapshot();assert.ok(p.fuelVisualEpoch>epoch);assert.equal(p.fuelVisualEvents.length,0);assert.equal(hopperVisuals(p,20).stored.length,8);
const full={...START,storedIds:Array.from({length:60},(_,i)=>i)};assert.equal(hopperVisuals(full,60).stored.length,60);assert.equal(hopperVisuals({...START,storedIds:[]},20).stored.length,0);
for(let i=0;i<60;i++){const b=hopperSlot(i,60);assert.ok(Number.isFinite(b.z)&&b.radius>0&&b.z+b.radius<=.82);}
d.dispose();console.log('PASS hopper preloads, capture/shot identity, count conservation, paused animation, completed flight, reset epoch and capacity 60');
`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const file=path.join(os.tmpdir(),'g3-hopper-test.mjs');await fs.writeFile(file,result.outputFiles[0].text);await import(pathToFileURL(file));
