import fs from 'node:fs';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import vm from 'node:vm';
const req=createRequire(import.meta.url),{transform}=createRequire(req.resolve('vite'))('esbuild');
const helper=await transform(fs.readFileSync('src/lib/browserAttendance.ts','utf8'),{loader:'ts',format:'cjs'});const mod={exports:{}};vm.runInNewContext(helper.code,{module:mod,exports:mod.exports,Error,Number,Date,Promise});const {browserLocationAttendance}=mod.exports;
let submitted=0,options;const good={coords:{latitude:32,longitude:34,accuracy:10},timestamp:100000};
const geo={getCurrentPosition(ok,fail,opts){options=opts;ok(good)}};
await browserLocationAttendance(geo,async()=>submitted++,()=>100000);assert.equal(submitted,1);assert.equal(options.maximumAge,0);assert.equal(options.enableHighAccuracy,true);
for(const code of [1,2,3])await assert.rejects(browserLocationAttendance({getCurrentPosition(ok,fail){fail({code})}},async()=>submitted++,()=>100000));
await assert.rejects(browserLocationAttendance(undefined,async()=>submitted++));
await assert.rejects(browserLocationAttendance({...geo,getCurrentPosition(ok){ok({...good,timestamp:1})}},async()=>submitted++,()=>100000));
await assert.rejects(browserLocationAttendance(geo,async()=>{throw Error('OUTSIDE_WORKSHOP_RADIUS')},()=>100000),/OUTSIDE_WORKSHOP_RADIUS/);assert.equal(submitted,1);
// Run the unchanged Edge handler against a deterministic in-memory database adapter.
const raw=fs.readFileSync('../../supabase/functions/attendance/index.ts','utf8').replace(/^import .*\r?\n/,'');const compiled=await transform(raw,{loader:'ts',format:'cjs'});
let handler,state;
function reset(){state={active:true,authenticated:true,existing:null,meetingStatus:'open',writes:0};}
const admin={rpc:async()=>({data:0,error:null}),from(table){let op='read',filters=[];const q=new Proxy({}, {get(_,k){if(k==='then')return resolve=>Promise.resolve(run()).then(resolve);if(k==='single'||k==='maybeSingle')return ()=>Promise.resolve(run());return (...args)=>{if(['insert','update'].includes(k)){op=k;}if(k==='is')filters.push(args);return q;};}});function run(){let data=null;if(table==='team_members')data={id:'qa',active:state.active,must_change_password:false};if(table==='workshop_locations')data={latitude:32,longitude:34,radius_m:100};if(table==='trusted_wifi_networks')data={id:'trusted'};if(table==='team_meetings')data={id:'meeting',status:state.meetingStatus};if(table==='attendance_records'){if(op==='read')data=filters.length&&state.existing?.checked_out_at?null:state.existing;else{state.writes++;data={id:'record',checked_in_at:'now',checked_out_at:op==='update'?'now':null};}}return {data,error:null};}return q;}};
vm.runInNewContext(compiled.code,{Deno:{env:{get:()=>''},serve:h=>handler=h},createClient:()=>({...admin,auth:{getUser:async()=>({data:{user:state.authenticated?{id:'qa'}:null},error:null})}}),Response,Date,Math,Number,Intl,console});
async function call(action,latitude=32,extra={}){return handler(new Request('https://fixture.invalid',{method:'POST',headers:{Authorization:'Bearer test'},body:JSON.stringify({action,meetingId:'meeting',latitude,longitude:34,accuracy:10,...extra})}));}
for(const action of ['check_in','check_out']){reset();assert.equal((await call(action,32.002)).status,403);assert.equal(state.writes,0);reset();assert.equal((await call(action,32,{accuracy:151})).status,400);assert.equal(state.writes,0);reset();assert.equal((await call(action)).status,200);assert.equal(state.writes,1);}
reset();state.active=false;assert.equal((await call('check_in')).status,403);reset();state.authenticated=false;assert.equal((await call('check_in')).status,401);
reset();state.existing={id:'record',checked_out_at:null};assert.equal((await call('check_in')).status,409);assert.equal(state.writes,0);
reset();state.existing={id:'record',checked_out_at:null};state.meetingStatus='closed';assert.equal((await call('check_out')).status,200);
reset();assert.equal((await call('check_in',32,{verification:'wifi',ssid:'fixture'})).status,200);
console.log('PASS: browser GPS/errors/stale fixes; unchanged Edge inside/outside 100m, inaccurate, auth, duplicate, late checkout and native Wi-Fi compatibility. No network or real attendance writes.');
