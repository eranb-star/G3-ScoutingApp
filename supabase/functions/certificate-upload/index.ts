import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import {PNG} from 'npm:pngjs@7.0.0';
import {Buffer} from 'node:buffer';
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
Deno.serve(async request=>{
 if(request.method==='OPTIONS')return new Response('ok',{headers});
 const reply=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers});
 try{
  if(request.method!=='POST')return reply(405,{error:'POST required'});
  const url=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin=createClient(url,key,{auth:{persistSession:false}});
  const token=request.headers.get('Authorization')?.replace(/^Bearer /i,'');
  if(!token)return reply(401,{error:'Sign in before uploading'});
  const {data:{user},error}=await admin.auth.getUser(token);
  if(error||!user)return reply(401,{error:'Session expired'});
  const member=await admin.from('team_members').select('active').eq('id',user.id).maybeSingle();
  if(!member.data?.active)return reply(403,{error:'Active membership required'});
  // Limit storage abuse, including abandoned uploads. No untrusted PDF is stored.
  const prefix=user.id;
  const recent=await admin.storage.from('training-certificates').list(prefix,{limit:100,sortBy:{column:'created_at',order:'desc'}});
  if(recent.error)throw recent.error;
  if((recent.data??[]).length>=100)return reply(429,{error:'Certificate storage limit reached. Ask an administrator to review unused uploads.'});
  if((recent.data??[]).filter(x=>Date.parse(x.created_at)>Date.now()-3600000).length>=12)return reply(429,{error:'Upload limit reached. Try again in an hour.'});
  const reader=request.body?.getReader();if(!reader)return reply(400,{error:'Certificate image required'});
  let length=0;const chunks:Uint8Array[]=[];
  while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>5*1024*1024){await reader.cancel();return reply(413,{error:'Certificate image exceeds 5 MB'});}chunks.push(value);}
  const bytes=Buffer.concat(chunks);
  if(bytes.length<33||!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||bytes.toString('ascii',12,16)!=='IHDR')return reply(400,{error:'A PNG certificate image is required'});
  const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
  if(!width||!height||width>4000||height>4000||width*height>8000000)return reply(400,{error:'Image dimensions exceed the certificate limit'});
  const decoded=PNG.sync.read(bytes,{checkCRC:true});
  const clean=PNG.sync.write({width:decoded.width,height:decoded.height,data:decoded.data},{colorType:6});
  const path=`${user.id}/${crypto.randomUUID()}.png`;
  const saved=await admin.storage.from('training-certificates').upload(path,clean,{contentType:'image/png',upsert:false,cacheControl:'0'});
  if(saved.error)throw saved.error;
  return reply(200,{path});
 }catch{return reply(400,{error:'Certificate image could not be validated or stored. Retry with a clear PDF or photo.'});}
});
