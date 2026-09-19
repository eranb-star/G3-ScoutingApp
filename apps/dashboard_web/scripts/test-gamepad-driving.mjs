// Controller semantics + real physics. Synthetic controller, no hardware/network.
import {createRequire} from 'node:module';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {pathToFileURL} from 'node:url';
const req=createRequire(import.meta.url),{build}=createRequire(req.resolve('vite'))('esbuild');
const result=await build({stdin:{contents:`
import assert from 'node:assert/strict';
import {freshProfile,padCommand,padNeutral,padProblem,axisValue,centeredProfile,padButton,padKey,savePadProfile,loadPadProfile,validProfile} from './src/lib/twinGamepad';
import {createPhysicalDrive} from './src/lib/physicalDrive';import {DEFAULT_CONCEPT} from './src/lib/conceptTwin';
const p=freshProfile(),pad={id:'Test Xbox',index:0,mapping:'standard',connected:true,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0,touched:false}))};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8, a+' != '+b);
assert.equal(padProblem(pad,p),'');assert.ok(padNeutral(pad,p));
pad.axes[1]=-1;for(const h of [0,Math.PI/2,Math.PI,-Math.PI/2]){const c=padCommand(pad,p,h);near(c.vx,Math.cos(h));near(c.vy,Math.sin(h));near(c.omega,0);}assert.ok(!padNeutral(pad,p));
pad.axes=[1,0,0,0];let c=padCommand(pad,p,0);near(c.vx,0);near(c.vy,-1);
pad.axes=[0,0,1,0];assert.ok(padCommand(pad,p,0).omega<0,'right stick right is clockwise');pad.axes[2]=-1;assert.ok(padCommand(pad,p,0).omega>0);
pad.axes=[1,-1,0,0];c=padCommand(pad,p,0);near(Math.hypot(c.vx,c.vy),1);
p.frame='field';pad.axes=[0,-1,0,0];c=padCommand(pad,p,Math.PI/2);near(c.vx,1);near(c.vy,0);p.frame='robot';
pad.axes=[.03,-.02,.04,0];assert.ok(padNeutral(pad,p));p.forward.center=.1;pad.axes[1]=.1;near(axisValue(pad,p.forward,p.deadband),0);pad.axes[1]=-1;near(axisValue(pad,p.forward,p.deadband),1);p.forward.center=0;
pad.axes=[0,-.56,0,0];p.curve=2;near(padCommand(pad,p,0).vx,.25);p.curve=1.5;
pad.axes=[.1,-.1,.05,0];const calibrated=centeredProfile(pad,p);assert.ok(padNeutral(pad,calibrated));pad.axes[1]=-1;assert.throws(()=>centeredProfile(pad,p),/Release/);
assert.match(padProblem({...pad,connected:false},p),/unavailable/);assert.match(padProblem({...pad,mapping:''},p),/Non-standard/);assert.equal(padProblem({...pad,mapping:''},{...p,verified:true}),'');
assert.match(padProblem(pad,{...p,turn:{...p.turn,axis:0}}),/different axes/);assert.match(padProblem({...pad,axes:[0,0]},p),/unavailable/);assert.match(padProblem(pad,{...p,shootButton:0}),/different button/);
pad.axes=[0,0,0,0];pad.buttons[7]={pressed:true,value:1,touched:true};assert.ok(padButton(pad,7));assert.ok(!padNeutral(pad,p));pad.buttons[7]={pressed:false,value:0,touched:false};assert.ok(!padButton(pad,7));
assert.ok(!validProfile({...p,curve:NaN}));assert.ok(!validProfile({...p,deadband:1}));
const joystick={...p,strafe:{axis:-1,invert:false,center:0},turn:{axis:0,invert:false,center:0},intakeButton:-1,shootButton:-1,stopButton:-1,verified:true};assert.equal(padProblem({...pad,mapping:'',axes:[0,-1],buttons:[]},joystick),'');near(padCommand({...pad,axes:[0,-1]},joystick,0).vx,1);
const store=new Map();globalThis.localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};savePadProfile(padKey(pad),p);assert.deepEqual(loadPadProfile(padKey(pad)),p);assert.deepEqual(loadPadProfile('different controller'),freshProfile());store.set('g3-gamepad-v1:broken','{');assert.deepEqual(loadPadProfile('broken'),freshProfile());
for(const heading of [0,Math.PI/2]){const d=await createPhysicalDrive(DEFAULT_CONCEPT);d.reset(0,0);d.body.setRotation({x:0,y:0,z:Math.sin(heading/2),w:Math.cos(heading/2)},true);pad.axes=[0,-1,0,0];for(let i=0;i<60;i++)d.step(padCommand(pad,p,d.snapshot().heading));const pos=d.snapshot();assert.ok(heading===0?pos.x>.2&&Math.abs(pos.y)<.05:pos.y>.2&&Math.abs(pos.x)<.05,'forward follows physical front');d.dispose();}
const d=await createPhysicalDrive(DEFAULT_CONCEPT);d.reset(0,0);pad.axes=[0,0,1,0];for(let i=0;i<45;i++)d.step(padCommand(pad,p,d.snapshot().heading));assert.ok(d.snapshot().heading<-.1,'physics rotation is clockwise');d.dispose();
console.log('PASS: Xbox forward/strafe/turn, all cardinal headings, field mode, deadband/curve/diagonal limits, calibration, profile validation/persistence, buttons/neutral interlock, unknown/disconnected/invalid devices, real physics forward at 0/90 degrees and clockwise turning.');
`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const file=path.join(os.tmpdir(),'g3-gamepad-test.mjs');await fs.writeFile(file,result.outputFiles[0].text);await import(pathToFileURL(file));
