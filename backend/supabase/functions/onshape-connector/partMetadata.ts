import type {BomRow} from './bom.ts';

export type PartMetadata={status:'available'|'missing'|'unsupported';observedAt:string;partNumber:string;material:string;vendor:string;revision:string;metadataMicroversion:string;process:null};
const string=(v:unknown,max=500)=>typeof v==='string'?v.slice(0,max):'';
export const metadataGroup=(r:BomRow)=>JSON.stringify([r.documentId,r.microversion,r.elementId,r.configuration]);
export function metadataPath(row:BomRow){
 if(![row.documentId,row.microversion,row.elementId].every(x=>/^[a-f0-9]{24}$/i.test(x)))throw Error('Invalid metadata identity');
 if(row.configuration.length>2048)throw Error('Invalid metadata configuration');
 return `/parts/d/${row.documentId}/m/${row.microversion}/e/${row.elementId}?configuration=${encodeURIComponent(row.configuration||'default')}&withThumbnails=false`;
}
export function normalizePartMetadata(rows:BomRow[],response:unknown,observedAt:string):Record<string,PartMetadata>{
 if(!Array.isArray(response))throw Error('Unexpected part metadata response');
 const result:Record<string,PartMetadata>={};
 for(const row of rows){
  const matches=response.filter(p=>p&&typeof p==='object'&&p.partId===row.partId);
  if(matches.length>1)throw Error('Ambiguous part metadata identity');
  const part=matches[0];
  // Never attach a response for another element/revision/configuration to this row.
  if(part&&((part.elementId&&part.elementId!==row.elementId)||(part.microversionId&&part.microversionId!==row.microversion)))throw Error('Part metadata revision mismatch');
  result[row.key]={status:part?'available':'missing',observedAt,partNumber:string(part?.partNumber),material:string(part?.material?.displayName),vendor:string(part?.vendor),revision:string(part?.revision),metadataMicroversion:string(part?.metadataMicroversion),process:null};
 }
 return result;
}

/** One bounded provider request per call; immutable observations resume across requests. */
export async function enrichBomMetadata(db:any,read:(path:string)=>Promise<unknown>,snapshotId:string,rows:BomRow[],collect:boolean,observationId='00000000-0000-0000-0000-000000000000'){
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(observationId))throw Error('Invalid metadata observation');
 const groups=new Map<string,BomRow[]>();
 for(const row of rows)if(row.partId!=='@assembly'){const key=metadataGroup(row);groups.set(key,[...(groups.get(key)??[]),row]);}
 if(groups.size>500)throw Error('Metadata requires a smaller assembly (maximum 500 distinct Part Studio configurations)');
 const stored=await db.from('cad_part_metadata').select('group_key,parts').eq('snapshot_id',snapshotId).eq('observation_id',observationId).limit(501);
 if(stored.error)throw Error('Part metadata storage unavailable');
 const cache=new Map<string,Record<string,PartMetadata>>((stored.data??[]).map((r:any)=>[r.group_key,r.parts]));
 const next=[...groups].find(([key])=>!cache.has(key));
 if(next&&collect){
  const [key,group]=next,observedAt=new Date().toISOString();
  const response=await read(metadataPath(group[0]));
  if(!Array.isArray(response)||response.length>20000)throw Error('Part metadata response is invalid or too large');
  // Cache the complete returned Part Studio group. Changing purchased-assembly
  // boundaries must not leave a previously hidden sibling permanently pending.
  const base=group[0],allRows=new Map(group.map(row=>[row.key,row]));
  for(const part of response){
   if(typeof part?.partId!=='string'||!part.partId)throw Error('Part metadata identity missing');
   const partKey=JSON.stringify([base.documentId,base.microversion,base.elementId,base.configuration,part.partId]);
   allRows.set(partKey,{...base,key:partKey,partId:part.partId});
  }
  const values=normalizePartMetadata([...allRows.values()],response,observedAt);
  const saved=await db.from('cad_part_metadata').upsert({snapshot_id:snapshotId,observation_id:observationId,group_key:key,parts:values,observed_at:observedAt},{onConflict:'snapshot_id,group_key,observation_id',ignoreDuplicates:true});
  if(saved.error)throw Error('Part metadata could not be retained');
  // Read the winning observation if another request collected the same group.
  const confirmed=await db.from('cad_part_metadata').select('parts').eq('snapshot_id',snapshotId).eq('observation_id',observationId).eq('group_key',key).single();
  if(confirmed.error||!confirmed.data)throw Error('Part metadata save not confirmed');
  cache.set(key,confirmed.data.parts);
 }
 const pending=[...groups].filter(([key])=>!cache.has(key)).length;
 return {rows:rows.map(row=>({...row,metadata:row.partId==='@assembly'?{status:'unsupported',process:null}:cache.get(metadataGroup(row))?.[row.key]??{status:cache.has(metadataGroup(row))?'missing':'pending',process:null}})),metadataProgress:{total:groups.size,pending}};
}
