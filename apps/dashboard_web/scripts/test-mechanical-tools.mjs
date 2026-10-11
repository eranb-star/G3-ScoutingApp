import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import{pathToFileURL}from'node:url';import ts from'typescript';
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'g3-drive-test-'));
try{
 const src=await fs.readFile('src/lib/mechanicalDrive.ts','utf8');await fs.writeFile(path.join(dir,'engine.mjs'),ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText);
 const {defaultDrive:d,solveDrive:solve,lengthAt,centerFor,pitchDiameter,alternatives}=await import(pathToFileURL(path.join(dir,'engine.mjs')));
 const near=(a,b,t=1e-7)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
 // Equal pulleys: pitch length = 2C + Np; independently soluble.
 near(solve({...d,n1:20,n2:20,center:250}).center,250);assert.equal(solve({...d,n1:20,n2:20,center:250}).count,120);
 near(solve({...d,kind:'chain',pitch:6.35,n1:20,n2:20,mode:'spacing',count:100}).center,254);
 near(pitchDiameter('chain',12,6.35),6.35/Math.sin(Math.PI/12));near(pitchDiameter('belt',20,5),100/Math.PI);
 // Unequal belts: independent tangent-segment + major/minor arc decomposition.
 const r1=24*5/(2*Math.PI),r2=48*5/(2*Math.PI),a=Math.asin((r2-r1)/250);
 near(lengthAt(d,250),2*Math.sqrt(250**2-(r2-r1)**2)+r1*(Math.PI-2*a)+r2*(Math.PI+2*a));
 for(const kind of ['belt','chain'])for(const n1 of [12,24,72])for(const n2 of [16,48,80])for(const c of [250,800]){
  const i={...d,kind,n1,n2,center:c};const count=lengthAt(i,c)/i.pitch;near(centerFor(i,count),c);
  near(lengthAt(i,c),lengthAt({...i,n1:n2,n2:n1},c));const x=solve(i);assert.ok(Number.isFinite(x.wrap)&&x.wrap>0&&x.wrap<=180);
  if(kind==='chain')assert.equal(x.count%2,0);
 }
 assert.throws(()=>solve({...d,n1:24.5}));assert.throws(()=>solve({...d,pitch:NaN}));assert.throws(()=>solve({...d,center:5}));
 assert.throws(()=>solve({...d,kind:'chain',mode:'spacing',count:101}));assert.ok(solve({...d,kind:'chain',mode:'spacing',count:101,even:false}));
 assert.throws(()=>solve({...d,mode:'spacing',count:2}));assert.throws(()=>solve({...d,adjustment:26}));
 const x=solve(d);for(const alt of alternatives(d,x)){near(lengthAt(d,alt.center),alt.length);assert.notEqual(alt.count,x.count);}
 assert.ok(solve({...d,round:'up'}).count>=solve({...d,round:'down'}).count);
 // Zero adjustment preserves nominal spacing; manual adjustment never changes selected length.
 near(solve({...d,adjustment:2}).adjusted,x.center+2);near(solve({...d,adjustment:2}).length,x.length);
 console.log('Mechanical drive reference, symmetry, inverse, rounding, bounds and invalid-input checks passed.');
}finally{await fs.rm(dir,{recursive:true,force:true});}
