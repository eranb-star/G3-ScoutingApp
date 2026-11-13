import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const headers={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Content-Type":"application/json"};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
const decode=(value:string)=>Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
Deno.serve(async request=>{
 if(request.method==='OPTIONS')return reply({});
 if(request.method!=='POST')return reply({error:'POST required'},405);
 try{
  const raw=await request.text();if(raw.length>12000)return reply({error:'Request too large'},413);
  const envelope=JSON.parse(raw),payload=envelope.payload;
  if(typeof payload!=='string'||typeof envelope.signature!=='string')return reply({error:'Signed payload required'},400);
  const data=JSON.parse(payload),action=data.action;
  if(!['prepare','arm','begin','confirm','cancel','revoke','status'].includes(action))return reply({error:'Unsupported action'},400);
  const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
  let member:string,key:JsonWebKey;
  if(action==='arm'||action==='prepare'){
   const bearer=request.headers.get('Authorization')?.replace(/^Bearer /,'');
   if(!bearer)return reply({error:'Sign in required'},401);
   const auth=await db.auth.getUser(bearer);if(auth.error||!auth.data.user)return reply({error:'Sign in required'},401);
   member=auth.data.user.id;key=data.publicKey;
  }else{
   const {data:grant,error}=await db.from('attendance_auto_grants').select('member_id,public_key').eq('id',data.grantId).maybeSingle();
   if(error||!grant)return reply({error:'Invalid grant'},403);
   member=grant.member_id;key=grant.public_key;
  }
  if(key?.kty!=='RSA'||key.e!=='AQAB'||typeof key.n!=='string'||key.n.length!==342)return reply({error:'RSA 2048 device key required'},400);
  const publicKey=await crypto.subtle.importKey('jwk',{kty:'RSA',n:key.n,e:key.e,alg:'RS256',ext:true},{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',publicKey,decode(envelope.signature),new TextEncoder().encode(payload)))return reply({error:'Invalid device signature'},403);
  const {data:result,error}=await db.rpc('attendance_auto_transition',{p_action:action,p_member:member,p_grant:['arm','prepare'].includes(action)?null:data.grantId,p_data:data});
  if(error)return reply({error:error.message},409);
  return reply(result);
 }catch{return reply({error:'Invalid automatic attendance request'},400);}
});
