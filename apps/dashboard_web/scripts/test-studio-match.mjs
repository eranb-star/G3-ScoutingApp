import fs from 'node:fs';import assert from 'node:assert/strict';import ts from 'typescript';
const moduleUrl=file=>{const compiled=ts.transpileModule(fs.readFileSync(file,'utf8'),{reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}});assert.equal(compiled.diagnostics?.length??0,0);let code=compiled.outputText;code=code.replace(/from ['"](\.[^'"]+)['"]/g,(_,p)=>'from '+JSON.stringify(moduleUrl(new URL(p.endsWith('.ts')?p:p+'.ts',file))));return 'data:text/javascript;base64,'+Buffer.from(code).toString('base64');};
const load=async p=>import(moduleUrl(new URL(p,import.meta.url)));
const {evaluateRoute}=await load('../src/lib/autonomousPlanning.ts');
const {routePoseAt}=await load('../src/lib/routePlayback.ts');
const season={schema:1,season:2031,revision:'test',name:'test',field:{length:20,width:12,geometry:'proxy',obstacles:[],tags:[]},autonomous:{seconds:20,reviewed:false},supportedInteractions:['intake','shoot','wait']};
const robot={length:1,width:1,speed:2,acceleration:2,turnRate:1,clearance:.1,measured:false};
const point=(x,y=0)=>({x,y,heading:0,action:'none',seconds:0,points:0,success:1});
const hold20=[{...point(0),action:'wait',seconds:20}];
const reserveRobot={...robot,constraints:{reserveSeconds:1,reservations:[]}};
assert.equal(evaluateRoute(season,reserveRobot,hold20).errors.length,0);
assert.ok(evaluateRoute(season,reserveRobot,hold20).warnings.some(w=>w.includes('Optional time reserve')));
assert.ok(evaluateRoute(season,robot,[{...hold20[0],seconds:20.01}]).errors.some(w=>w.includes('duration')));
const {preparedRoute}=await load('../src/lib/routeSmoothing.ts');
const authored=[point(-2,-2),point(0,-2),point(0,1)],copy=JSON.stringify(authored),smooth={...robot,smoothCorners:true,headingMode:'travel'};
assert.ok(preparedRoute(authored,smooth).length>authored.length);assert.equal(JSON.stringify(authored),copy);
const result=evaluateRoute(season,smooth,authored),end=routePoseAt(season,smooth,authored,result.seconds);assert.equal(end.x,0);assert.equal(end.y,1);assert.ok(Math.abs(end.heading-Math.PI/2)<1e-9);
const {matchState,autoWinner}=await load('../src/lib/twinMatch.ts');
assert.equal(matchState(2.99,0).drive,false);assert.equal(matchState(3,0).auto,true);
assert.equal(matchState(23,0).drive,false);assert.deepEqual(matchState(23,0).credit,[true,true]);
assert.equal(matchState(26,0).phase,'TRANSITION');assert.equal(matchState(26,0).chase,0);
assert.deepEqual(matchState(36,0).active,[false,true]);assert.deepEqual(matchState(38.99,0).credit,[true,true]);assert.deepEqual(matchState(39,0).credit,[false,true]);
assert.deepEqual(matchState(61,0).active,[true,false]);assert.deepEqual(matchState(86,0).active,[false,true]);assert.deepEqual(matchState(111,0).active,[true,false]);
assert.deepEqual(matchState(136,0).active,[true,true]);assert.equal(matchState(166,0).drive,false);assert.deepEqual(matchState(168.99,0).credit,[true,true]);assert.equal(matchState(169,0).done,true);assert.deepEqual(matchState(169,0).credit,[false,false]);
assert.equal(autoWinner(8,9,0),1);assert.equal(autoWinner(8,8,1),1);
const {autonomousScaffold}=await load('../src/lib/autonomousExport.ts');const code=autonomousScaffold({season,robot:smooth,route:authored});assert.ok(code.includes('public final class G3AutoScaffold'));assert.ok(code.includes('!autonomousEnabled'));assert.ok(code.includes('robot.stop()'));assert.throws(()=>autonomousScaffold({season,robot,route:[point(0)]}));
console.log('PASS authored smoothing, reserve vs official limit, match boundaries/grace/alternation/tie and scaffold safety');

const os=await import('node:os'),path=await import('node:path'),cp=await import('node:child_process');const javac='C:/Program Files/Android/Android Studio/jbr/bin/javac.exe';if(fs.existsSync(javac)){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g3-auto-compile-'));fs.writeFileSync(path.join(dir,'G3AutoScaffold.java'),autonomousScaffold({season,robot,route:[point(0),{...point(0),action:'wait',seconds:20}]}));cp.execFileSync(javac,[path.join(dir,'G3AutoScaffold.java')]);console.log('PASS full-duration Java scaffold compiled with installed JDK; robot adapter remains project-specific');}

const {shootingStops}=await load('../src/lib/shootingStops.ts');const {DEFAULT_SHOOTER}=await load('../src/lib/shooter.ts');
const stops=shootingStops({...season,season:2026},{...robot,inventory:{capacity:40,preload:8}},[point(-6,2)],DEFAULT_SHOOTER,0);assert.ok(stops.length>0);assert.ok(stops.every(s=>s.x< -3.644&&s.result.seconds<=20&&s.points.at(-1).quantity===8));assert.throws(()=>shootingStops(season,robot,[point(0)],DEFAULT_SHOOTER,0));
console.log('PASS bounded shooting-stop candidates, inventory, duration and unsupported-season refusal');
