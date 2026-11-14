import {assemblyPlacements,meshPositions} from './geometry.ts';
import {CadError,onshapeId} from './security.ts';

// The plan is always reconstructed from the authorized immutable snapshot.
// A client may select an index, never an arbitrary provider path or cache key.
export function assemblyGeometryPlan(snapshot:any){
 const placements=assemblyPlacements(snapshot.evidence.assembly);
 const parts:any[]=[],indices=new Map<string,number>();
 const meshes=placements.map(p=>{
  const part=p.part,key=JSON.stringify([part.documentId,part.documentMicroversion,part.elementId,part.partId,part.fullConfiguration||part.configuration||'']);
  let index=indices.get(key);
  if(index===undefined){index=parts.length;indices.set(key,index);parts.push(part);}
  return {id:p.path.join('/'),name:part.name||part.partId,partIndex:index,transform:p.transform};
 });
 if(parts.length>500)throw new CadError('GEOMETRY_LIMIT','This assembly exceeds 500 distinct display parts. Import a subsystem; the existing build is unchanged.',413);
 return {parts,meshes};
}
export async function assemblyGeometryPart(snapshot:any,index:unknown,bucket:any,prefix:string,read:(path:string)=>Promise<any>){
 const plan=assemblyGeometryPlan(snapshot);
 if(!Number.isInteger(index)||Number(index)<0||Number(index)>=plan.parts.length)throw new CadError('INVALID_PART','Choose a part from this revision.',400);
 const path=`${prefix}/${snapshot.id}-parts-v1/${index}.json`;
 const cached=await bucket.download(path);
 if(cached.error){
  if(String(cached.error.statusCode||cached.error.status)!=='404'&&!/not found/i.test(cached.error.message||''))throw new CadError('STORAGE_UNAVAILABLE','Could not check saved CAD progress. Retry.',503);
  const part=plan.parts[Number(index)];
  const data=await read(`/parts/d/${onshapeId(part.documentId)}/m/${onshapeId(part.documentMicroversion)}/e/${onshapeId(part.elementId)}/partid/${encodeURIComponent(part.partId)}/tessellatedfaces?configuration=${encodeURIComponent(part.fullConfiguration||part.configuration||'')}&outputIndexTable=true&outputFacetNormals=false`);
  const positions=meshPositions(data);
  if(!positions.length)throw new CadError('GEOMETRY_UNAVAILABLE','Onshape returned no surfaces for this assembly part. No partial assembly was imported.',422);
  const saved=await bucket.upload(path,JSON.stringify({positions}),{contentType:'application/json',upsert:false});
  if(saved.error&&!/already exists|duplicate/i.test(saved.error.message||''))throw new CadError('STORAGE_UNAVAILABLE','Could not save CAD progress. Retry.',503);
 }
 const signed=await bucket.createSignedUrl(path,120);
 if(signed.error)throw new CadError('STORAGE_UNAVAILABLE','Could not open saved CAD geometry.',503);
 return {url:signed.data.signedUrl,partIndex:index,snapshotId:snapshot.id};
}

// Compatibility asset for existing published-library readers. Never overwrite
// a previously imported revision, and never finalize an incomplete assembly.
export async function finalizeAssemblyGeometry(snapshot:any,bucket:any,prefix:string){
 const asset=`${prefix}/${snapshot.id}-v3.json`;
 const existing=await bucket.createSignedUrl(asset,120);
 if(!existing.error)return {url:existing.data.signedUrl,snapshotId:snapshot.id};
 const plan=assemblyGeometryPlan(snapshot),positions:number[][]=new Array(plan.parts.length),sizes:number[]=new Array(plan.parts.length);let next=0,bytes=0;
 async function worker(){while(next<positions.length){const index=next++,file=await bucket.download(`${prefix}/${snapshot.id}-parts-v1/${index}.json`);
  if(file.error)throw new CadError('INCOMPLETE_GEOMETRY','Some CAD parts are not ready. Retry to resume saved progress.',409);
  bytes+=file.data.size;if(bytes>30_000_000)throw new CadError('GEOMETRY_LIMIT','This assembly exceeds the interactive import budget. Import a subsystem; existing parts are unchanged.',413);
  sizes[index]=file.data.size;positions[index]=JSON.parse(await file.data.text()).positions;
 }}
 await Promise.all(Array.from({length:4},worker));
 // Repeated occurrences reference a shared mesh. Keep legacy representation
 // for smaller assets; existing immutable assets are never rewritten.
 const expandedSize=plan.meshes.reduce((sum,m)=>sum+sizes[m.partIndex]+512,0);
 const model=expandedSize<=25_000_000?{units:'m',meshes:plan.meshes.map(({partIndex,...mesh})=>({...mesh,positions:positions[partIndex]})),lines:[],coverage:'assembly-geometry'}:
  {format:'shared-meshes-v1',units:'m',meshes:plan.meshes,meshPositions:positions,lines:[],coverage:'assembly-geometry'};
 const content=JSON.stringify(model);
 if(new TextEncoder().encode(content).length>30_000_000)throw new CadError('GEOMETRY_LIMIT','This assembly exceeds the interactive import budget. Import a subsystem; existing parts are unchanged.',413);
 const saved=await bucket.upload(asset,content,{contentType:'application/json',upsert:false});
 if(saved.error&&!/already exists|duplicate/i.test(saved.error.message||''))throw new CadError('STORAGE_UNAVAILABLE','Could not finalize CAD import. Retry to resume saved progress.',503);
 const signed=await bucket.createSignedUrl(asset,120);
 if(signed.error)throw new CadError('STORAGE_UNAVAILABLE','Could not open finalized CAD import.',503);
 return {url:signed.data.signedUrl,snapshotId:snapshot.id};
}
