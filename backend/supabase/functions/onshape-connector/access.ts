import {CadError} from './security.ts';
/** Resolve credentials only after role, explicit sharing and source identity checks. */
export async function cadAccess(db:any,id:string,body:any){
 const member=await db.from('team_members').select('active,role').eq('id',id).maybeSingle();
 if(member.error||!member.data?.active||!['admin','team_leader'].includes(member.data.role))throw new CadError('ACCESS_DENIED','An active admin or team leader is required for team CAD.',403);
 const admin=member.data.role==='admin';
 if(['connect','disconnect','share-connection'].includes(body.action)&&!admin)throw new CadError('ACCESS_DENIED','Only the connection administrator can manage Onshape authorization.',403);
 let sourceId=body.sourceId,connectionId;
 if(body.action==='build-freshness'){
  const bom=await db.from('robot_build_boms').select('snapshot_id,owner_id,shared_at,project_id').eq('id',body.bomId).maybeSingle();
  if(bom.error||!bom.data)throw new CadError('ACCESS_DENIED','Build access required.',403);
  if(bom.data.owner_id!==id){const allowed=await db.rpc('cad_build_manage',{p_actor:id,p_project:bom.data.project_id});if(!bom.data.shared_at||allowed.error||allowed.data!==true)throw new CadError('ACCESS_DENIED','Build access required.',403);}
  const snapshot=await db.from('cad_snapshots').select('source_id').eq('id',bom.data.snapshot_id).maybeSingle();sourceId=snapshot.data?.source_id;
  if(!sourceId)throw new CadError('SOURCE_UNAVAILABLE','Source unavailable.',404);
 }else if(body.snapshotId&&!sourceId){
  const snapshot=await db.from('cad_snapshots').select('source_id').eq('id',body.snapshotId).maybeSingle();sourceId=snapshot.data?.source_id;
  if(!sourceId)throw new CadError('SOURCE_UNAVAILABLE','Source unavailable.',404);
 }
 if(sourceId){const source=await db.from('cad_sources').select('connection_id').eq('id',sourceId).is('archived_at',null).maybeSingle();connectionId=source.data?.connection_id;if(!connectionId)throw new CadError('SOURCE_UNAVAILABLE','Source unavailable.',404);}
 let result;
 if(connectionId)result=await db.from('cad_connections').select('*').eq('id',connectionId).is('disconnected_at',null).maybeSingle();
 else {
  if(admin)result=await db.from('cad_connections').select('*').eq('member_id',id).is('disconnected_at',null).maybeSingle();
  if(!result?.data&&!['connect','disconnect','share-connection'].includes(body.action))result=await db.from('cad_connections').select('*').eq('team_shared',true).is('disconnected_at',null).maybeSingle();
 }
 if(result?.error)throw new CadError('STORAGE_UNAVAILABLE','CAD connection storage unavailable.',503);
 const row=result?.data??null;
 if(row){const allowed=await db.rpc('cad_connection_access',{p_actor:id,p_connection:row.id});if(allowed.error||allowed.data!==true)throw new CadError('ACCESS_DENIED','This CAD connection is not shared with you.',403);}
 const canManage=admin&&(!row||row.member_id===id);
 if(['disconnect','share-connection'].includes(body.action)&&!canManage)throw new CadError('ACCESS_DENIED','Connection owner required.',403);
 return {row,admin,canManage};
}
