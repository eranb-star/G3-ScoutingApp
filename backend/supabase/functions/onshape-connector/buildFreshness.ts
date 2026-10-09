/** Caller has already validated the active admin and that admin's connection. */
export async function checkBuildSource(db:any,read:(path:string)=>Promise<any>,actor:string,connection:string,bomId:string){
 if(!/^[0-9a-f-]{36}$/i.test(bomId||''))throw Error('Choose an imported build parts list');
 const bom=await db.from('robot_build_boms').select('id,snapshot_id').eq('id',bomId).eq('owner_id',actor).maybeSingle();
 if(bom.error||!bom.data?.snapshot_id)throw Error('This imported parts list is unavailable to the source owner');
 const snapshot=await db.from('cad_snapshots').select('source_id,microversion').eq('id',bom.data.snapshot_id).single();
 if(snapshot.error||!snapshot.data)throw Error('Imported source revision is unavailable');
 const source=await db.from('cad_sources').select('document_id,reference_id,reference_type').eq('id',snapshot.data.source_id).eq('connection_id',connection).is('archived_at',null).maybeSingle();
 if(source.error||!source.data)throw Error('The original source connection is unavailable');
 const s=source.data;
 if(![s.document_id,s.reference_id,snapshot.data.microversion].every(x=>typeof x==='string'&&/^[a-f0-9]{24}$/i.test(x))||!['w','v','m'].includes(s.reference_type))throw Error('Invalid source identity');
 const request=crypto.randomUUID();
 const claim=await db.rpc('claim_robot_build_source_check',{p_actor:actor,p_bom:bomId,p_request:request});
 if(claim.error)throw Error('The source check could not be started');
 if(!claim.data)return{checking:false,cached:true};
 let current:string;
 try{
  current=s.reference_type==='m'?s.reference_id:(await read(`/documents/d/${s.document_id}/${s.reference_type}/${s.reference_id}/currentmicroversion`)).microversion;
  if(typeof current!=='string'||!/^[a-f0-9]{24}$/i.test(current))throw Error('Invalid current source revision');
 }catch{
  const failed=await db.from('robot_build_source_checks').update({error:'Source check failed. Reconnect or retry; the previous successful check is retained.',checking_until:null}).eq('bom_id',bomId).eq('request_id',request);
  if(failed.error)throw Error('Source check failed and its result could not be retained');
  throw Error('Source check failed. Existing imports and released work are unchanged');
 }
 const checkedAt=new Date().toISOString();
 const result=await db.from('robot_build_source_checks').update({checked_at:checkedAt,pinned_microversion:snapshot.data.microversion,current_microversion:current,reference_type:s.reference_type,error:null,checking_until:null}).eq('bom_id',bomId).eq('request_id',request).select('bom_id').maybeSingle();
 if(result.error||!result.data)throw Error('Source check result was not saved. Retry');
 return{checkedAt,changed:current!==snapshot.data.microversion,fixedReference:s.reference_type!=='w'};
}
