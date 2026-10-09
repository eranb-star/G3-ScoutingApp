// Resolve an immutable snapshot only within the caller's already-authorized connection.
// CAD tables remain service-only; never grant direct browser reads for this lookup.
export async function pinnedGeometrySource(db:any,connectionId:string,snapshotId:unknown){
 if(typeof snapshotId!=='string'||!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(snapshotId))return null;
 const snapshot=await db.from('cad_snapshots').select('source_id').eq('id',snapshotId).maybeSingle();
 if(snapshot.error||!snapshot.data)return null;
 const source=await db.from('cad_sources').select('id').eq('id',snapshot.data.source_id).eq('connection_id',connectionId).is('archived_at',null).maybeSingle();
 return source.error?null:source.data?.id??null;
}
