import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const req=createRequire(import.meta.url),{build}=createRequire(req.resolve('vite'))('esbuild');
const result=await build({stdin:{contents:`
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {loadPublishedRobot,posePublishedRobot,LIMESTONE_PROFILE} from './src/lib/publishedRobot';
import {setAllianceBumpers,isBumperMesh,ALLIANCE_COLORS} from './src/lib/robotAllianceAppearance';
import {createPhysicalDrive} from './src/lib/physicalDrive';
import {intakeForRobot,shooterForRobot} from './src/lib/robotPracticeDefaults';
const original=globalThis.fetch;
globalThis.fetch=async(url)=>new Response(fs.readFileSync(String(url).startsWith('http')?'../../docs/staging/limestone-learning.local/'+String(url).split('/').pop():'public'+url));
for(const id of ['darwin','limestone']){
 const {group}=await loadPublishedRobot(id,new AbortController().signal);
 const opponent=group.clone(true);let bumper,other;
 group.traverse(o=>{if(o instanceof THREE.Mesh){if(isBumperMesh(o,id))bumper=o;else if(!other&&o.material.color)other=o;}});
 assert.ok(bumper,'actual bumper mesh found for '+id);const originalOther=other.material.color.getHex();
 setAllianceBumpers(group,id,'red');setAllianceBumpers(opponent,id,'blue');
 assert.equal(bumper.material.color.getHexString(),new THREE.Color(ALLIANCE_COLORS.red).getHexString());
 assert.equal(other.material.color.getHex(),originalOther,'non-bumper materials preserved');
 group.position.x=5;setAllianceBumpers(group,id,'red');assert.equal(bumper.material.color.getHexString(),new THREE.Color(ALLIANCE_COLORS.red).getHexString(),'crossing center preserves alliance');
 setAllianceBumpers(group,id,'blue');setAllianceBumpers(opponent,id,'red');assert.equal(bumper.material.color.getHexString(),new THREE.Color(ALLIANCE_COLORS.blue).getHexString(),'independent clones');
 group.position.x=0;posePublishedRobot(id,group,false);group.updateMatrixWorld(true);console.log(id,'stowed',new THREE.Box3().setFromObject(group).getSize(new THREE.Vector3()));
 posePublishedRobot(id,group,true);group.updateMatrixWorld(true);console.log(id,'deployed',new THREE.Box3().setFromObject(group).getSize(new THREE.Vector3()));if(id==='limestone'){const hopper=group.getObjectByName('Limestone component 2');assert.equal(hopper.position.x,.303211,'published Epsilon hopper extends with intake');posePublishedRobot(id,group,false);assert.equal(hopper.position.x,0,'hopper retracts with intake');posePublishedRobot(id,group,true);assert.equal(hopper.position.x,.303211,'repeated toggles do not accumulate translation');}
}
globalThis.fetch=original;
const d=await createPhysicalDrive(LIMESTONE_PROFILE);d.reset(0,0);d.fuel.reset([{x:LIMESTONE_PROFILE.length/2+.16,y:0}]);for(let i=0;i<180;i++)d.step({vx:0,vy:0,omega:0},{...intakeForRobot('limestone'),on:true});assert.equal(d.fuel.collected,1,'Limestone intake feeds a physical ball');d.reset();d.fuel.reset();d.setOpponent(true,LIMESTONE_PROFILE);
for(let i=0;i<1300;i++)d.step({vx:0,vy:0,omega:0},intakeForRobot('limestone'),shooterForRobot('limestone'));
assert.ok(d.snapshot().opponent.scored>0,'Limestone opponent can collect and score');assert.equal(d.fuel.ledger().total,504);d.dispose();
console.log('PASS real CAD integrity, isolated alliance bumpers, published poses, Limestone AI scoring and conserved fuel');
`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const file=path.join(os.tmpdir(),'g3-published-robots-test.mjs');await fs.writeFile(file,result.outputFiles[0].text);await import(pathToFileURL(file));

