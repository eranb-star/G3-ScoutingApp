import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Cache-Control':'no-store'};
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers});
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers});
 if(req.method!=='POST')return reply({error:'Use POST'},405);
 try{
  const authorization=req.headers.get('Authorization')??'';
  if(!authorization.startsWith('Bearer '))return reply({error:'Sign in required'},401);
  const url=Deno.env.get('SUPABASE_URL')!,caller=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:authorization}}});
  const {data:{user}}=await caller.auth.getUser();if(!user)return reply({error:'Sign in required'},401);
  const body=await req.json();if(!/^[0-9a-f-]{36}$/i.test(body.fileId??'')||!['finalize','download'].includes(body.action))return reply({error:'Choose a work file'},400);
  // Caller RLS rechecks current assignment, sharing, release and account activity.
  const manifest=await caller.from('robot_build_files').select('*').eq('id',body.fileId).maybeSingle();
  if(manifest.error||!manifest.data)return reply({error:'This work file is unavailable for your current assignment'},403);
  const f=manifest.data,service=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const bucket=service.storage.from('robot-build-files'),key=`${f.created_by}/${f.id}`;
  if(body.action==='finalize'){
   if(f.created_by!==user.id)return reply({error:'Only the uploader can finalize this file'},403);
   const file=await bucket.download(key);if(file.error||!file.data)return reply({error:'Upload was not found. Retry the same file'},409);
   if(!file.data.size||file.data.size>20971520)return reply({error:'Files must be between 1 byte and 20 MB'},400);
   const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await file.data.arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join('');
   const saved=await service.rpc('finalize_robot_build_file',{p_file:f.id,p_actor:user.id,p_hash:hash,p_size:file.data.size});
   if(saved.error)return reply({error:'File verification could not be saved. Retry without replacing the file'},409);
   return reply({id:f.id,sha256:hash,byteSize:file.data.size});
  }
  if(f.status!=='ready')return reply({error:'This file has not finished verification'},409);
  const signed=await bucket.createSignedUrl(key,60,{download:f.name});
  if(signed.error)return reply({error:'Download could not be prepared. Retry'},503);
  return reply({url:signed.data.signedUrl,expiresIn:60,revision:f.revision,sha256:f.sha256});
 }catch{return reply({error:'Work file request could not complete. Retry'},503);}
});
