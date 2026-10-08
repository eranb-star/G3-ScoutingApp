import {CadError,onshapeId,cadValue} from './security.ts';
export type CadMesh={id:string;name:string;positions:number[];transform?:number[]};
export type CadLine={id:string;name:string;positions:number[];entityId?:string;construction?:boolean};
const point=(v:any):number[]=>Array.isArray(v)?v:[v?.x,v?.y,v?.z];
export function meshPositions(data:any){
 const result:number[]=[];
 const bodies=Array.isArray(data)?data:data?.bodies||[data];
 for(const body of bodies)for(const face of body?.faces||[])for(const facet of face.facets||[]){
  const vertices=facet.vertices??facet.indices?.map((index:number)=>body.facetPoints?.[index]);
  if(!Array.isArray(vertices)||vertices.length!==3)throw new CadError('GEOMETRY_FORMAT','Unsupported surface tessellation.',422);
  for(const vertex of vertices){const p=point(vertex);if(p.length!==3||!p.every(Number.isFinite))throw new CadError('GEOMETRY_FORMAT','Invalid surface coordinates.',422);result.push(...p);}
  if(result.length>1_800_000)throw new CadError('GEOMETRY_LIMIT','This design exceeds the interactive geometry limit. Select a smaller subsystem.',413);
 }
 return result;
}
export async function geometryFor(source:any,snapshot:any,read:(path:string)=>Promise<any>){
 const did=onshapeId(source.document_id),eid=onshapeId(source.element_id),micro=onshapeId(snapshot.microversion);
 const query=`configuration=${encodeURIComponent(source.configuration==='default'?'':source.configuration||'')}&outputIndexTable=false`;
 if(source.element_type==='PARTSTUDIO'){
  const parts=snapshot.evidence.parts;
  if(!Array.isArray(parts))throw new CadError('PARTS_UNAVAILABLE','Refresh the design to retrieve its parts.',409);
  if(parts.length>60)throw new CadError('GEOMETRY_LIMIT','Select a subsystem with up to 60 distinct parts for this import.',413);
  const meshes:CadMesh[]=[];const gaps:string[]=[];
  for(const part of parts){
   if(typeof part.partId!=='string'){gaps.push(`Part without a supported identifier: ${part.name||'unnamed'}`);continue;}
   const data=await read(`/parts/d/${did}/m/${micro}/e/${eid}/partid/${encodeURIComponent(part.partId)}/tessellatedfaces?${query}`);
   const positions=meshPositions(data);if(positions.length)meshes.push({id:part.partId,name:part.name||part.partId,positions});else gaps.push(`No surface geometry: ${part.name||part.partId}`);
  }
  const sketches=(cadValue(snapshot.evidence.features)?.features||[]).filter((f:any)=>f.featureType==='newSketch'&&!f.suppressed);
  const lines:CadLine[]=[];
  if(sketches.length>30)gaps.push(`${sketches.length-30} sketches exceed this import's 30-sketch limit. Open them in Onshape.`);
  for(const sketch of sketches.slice(0,30)){
   try{
    const data=await read(`/partstudios/d/${did}/m/${micro}/e/${eid}/sketches/${encodeURIComponent(sketch.featureId)}/tessellatedentities?configuration=${encodeURIComponent(source.configuration==='default'?'':source.configuration||'')}`);
    const extracted=sketchLines(data,sketch.featureId,sketch.name,sketch.entities);lines.push(...extracted);
    if(!extracted.length)gaps.push(sketch.name||sketch.featureId);
   }catch(error){if(error instanceof CadError&&['RECONNECT_REQUIRED','RATE_LIMITED'].includes(error.code))throw error;gaps.push(sketch.name||sketch.featureId);}
  }
  const result={units:'m',meshes,lines,counts:{partsExpected:parts.length,partsRendered:meshes.length,sketchesExpected:sketches.length,sketchesRendered:new Set(lines.map(l=>l.id.split('/')[0])).size},sketches:sketches.map((f:any)=>({id:f.featureId,name:f.name})),gaps,coverage:meshes.length?'solid-geometry':lines.length?'sketch-geometry':'sketch-data-only'};
  boundedAsset(result);return result;
 }
 const assembly=snapshot.evidence.assembly;
 if(!(assembly?.rootAssembly?.instances?.length))return {units:'m',meshes:[],lines:[],sketches:[],coverage:'empty-assembly'};
 const placements=assemblyPlacements(assembly);
 const cache=new Map<string,number[]>(),meshes:CadMesh[]=[];
 for(const placement of placements){
  const part=placement.part;
  const key=[part.documentId,part.documentMicroversion,part.elementId,part.partId,part.fullConfiguration||part.configuration||''].join(':');
  if(!cache.has(key)){
   if(cache.size>=60)throw new CadError('GEOMETRY_LIMIT','Select a subsystem with up to 60 distinct parts for this import.',413);
   const data=await read(`/parts/d/${onshapeId(part.documentId)}/m/${onshapeId(part.documentMicroversion)}/e/${onshapeId(part.elementId)}/partid/${encodeURIComponent(part.partId)}/tessellatedfaces?configuration=${encodeURIComponent(part.fullConfiguration||part.configuration||'')}&outputIndexTable=false`);
   cache.set(key,meshPositions(data));
  }
  meshes.push({id:placement.path.join('/'),name:part.name||part.partId,positions:cache.get(key)!,transform:placement.transform});
 }
 const result={units:'m',meshes,lines:[],sketches:[],coverage:'assembly-geometry'};boundedAsset(result);return result;
}
function boundedAsset(value:unknown){if(new TextEncoder().encode(JSON.stringify(value)).length>30_000_000)throw new CadError('GEOMETRY_LIMIT','This model exceeds the interactive import size. Select a smaller subsystem.',413);}
export function sketchLines(data:any,id:string,name:string,entities:any[]=[]):CadLine[]{
 const lines:CadLine[]=[];
 const metadata=new Map((cadValue(entities)||[]).filter((e:any)=>typeof e.entityId==='string').map((e:any)=>[e.entityId,e]));
 function walk(value:any,depth=0){
  if(!value||typeof value!=='object'||depth>10)return;
  const vertices=value.tessellationPoints??value.points??value.vertices;
  if(Array.isArray(vertices)&&vertices.length>=2){
   const points=vertices.map(point);
   if(points.every(p=>p.length===3&&p.every(Number.isFinite))){const entityId=typeof value.entityId==='string'?value.entityId:undefined;const entity:any=entityId?metadata.get(entityId):undefined;const construction=typeof value.isConstruction==='boolean'?value.isConstruction:entity?entity.isConstruction===true:undefined;lines.push({id:`${id}/${lines.length}`,name,positions:points.flat(),entityId,construction});return;}
  }
  for(const child of Object.values(value))if(typeof child==='object')walk(child,depth+1);
 }
 walk(data);return lines;
}
export function assemblyPlacements(assembly:any){
 const root=assembly.rootAssembly,subs=assembly.subAssemblies||[],result:{path:string[];part:any;transform:number[]}[]=[];
 for(const occurrence of root?.occurrences||[]){
  if(occurrence.suppressed)continue;
  let current=root,instance:any,suppressed=false;
  for(const id of occurrence.path||[]){
   instance=current?.instances?.find((v:any)=>v.id===id);
   if(!instance)throw new CadError('ASSEMBLY_FORMAT','An assembly occurrence could not be resolved.',422);
   if(instance.suppressed){suppressed=true;break;}
   if(instance.type==='Assembly')current=subs.find((s:any)=>s.documentId===instance.documentId&&s.elementId===instance.elementId&&s.documentMicroversion===instance.documentMicroversion&&(s.fullConfiguration||s.configuration)===(instance.fullConfiguration||instance.configuration));
  }
  if(!instance||suppressed||instance.type!=='Part')continue;
  if(!Array.isArray(occurrence.transform)||occurrence.transform.length!==16||!occurrence.transform.every(Number.isFinite))throw new CadError('ASSEMBLY_FORMAT','An assembly placement has no valid transform.',422);
  result.push({path:occurrence.path,part:instance,transform:occurrence.transform});
  if(result.length>1000)throw new CadError('GEOMETRY_LIMIT','Select a smaller subsystem with fewer than 1,000 placed parts.',413);
 }
 if(!result.length)throw new CadError('ASSEMBLY_FORMAT','No renderable part placements were returned. Select a Part Studio or refresh this assembly.',422);
 return result;
}
