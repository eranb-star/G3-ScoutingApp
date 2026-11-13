import fs from 'node:fs';import assert from 'node:assert/strict';import vm from 'node:vm';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{transform}=createRequire(require.resolve('vite'))('esbuild');
let handler,calls=0;
const keys=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const publicKey=await crypto.subtle.exportKey('jwk',keys.publicKey);
const db={auth:{getUser:async token=>token==='valid'?{data:{user:{id:'member'}}}:{error:'invalid',data:{}}},from:()=>({select:()=>({eq:(_,id)=>({maybeSingle:async()=>({data:id==='grant'?{member_id:'member',public_key:publicKey}:null})})})}),rpc:async()=>{calls++;return {data:{state:'pending'}}}};
const source=fs.readFileSync(new URL('../../../supabase/functions/attendance-auto/index.ts',import.meta.url),'utf8').replace(/^import .*;\r?\n/,'');
const compiled=await transform(source,{loader:'ts',format:'cjs'});
vm.runInNewContext(compiled.code,{createClient:()=>db,Deno:{env:{get:()=>''},serve:fn=>handler=fn},crypto,Response,Request,Uint8Array,TextEncoder,atob,JSON});
async function envelope(data){const payload=JSON.stringify(data),signature=Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',keys.privateKey,new TextEncoder().encode(payload))).toString('base64url');return {payload,signature};}
async function request(body,token){return handler(new Request('https://example.test',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)}));}
let signed=await envelope({action:'arm',publicKey});assert.equal((await request(signed)).status,401);assert.equal((await request(signed,'invalid')).status,401);assert.equal(calls,0);assert.equal((await request(signed,'valid')).status,200);
signed=await envelope({action:'begin',grantId:'grant',sequence:1});assert.equal((await request(signed)).status,200);
const before=calls;assert.equal((await request({...signed,payload:signed.payload.replace('begin','confirm')})).status,403);assert.equal((await request(await envelope({action:'begin',grantId:'other',sequence:1}))).status,403);assert.equal((await request({action:'check_out',automatic:true})).status,400);assert.equal(calls,before);
const attacker=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);signed.signature=Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',attacker.privateKey,new TextEncoder().encode(signed.payload))).toString('base64url');assert.equal((await request(signed)).status,403);assert.equal(calls,before);
console.log('PASS automatic checkout HTTP: authenticated enrollment, device RSA signature, tampered payload, wrong key/grant, automatic flag denial; no mutation before authorization');
