import {CadError,onshapeId} from './security.ts';
export async function captureSnapshot(source:any,read:(path:string)=>Promise<any>){
 const did=onshapeId(source.document_id),eid=onshapeId(source.element_id),ref=onshapeId(source.reference_id);
 if(!['w','v','m'].includes(source.reference_type))throw new CadError('INVALID_SOURCE','Invalid source reference.');
 const microversion=source.reference_type==='m'?ref:onshapeId((await read(`/documents/d/${did}/${source.reference_type}/${ref}/currentmicroversion`)).microversion);
 const path=`d/${did}/m/${microversion}/e/${eid}`,query=`configuration=${encodeURIComponent(source.configuration==='default'?'':source.configuration||'')}`;
 // Every evidence request is pinned to the same immutable revision, never the moving workspace.
 const evidence:Record<string,unknown>={},coverage:{kind:string;status:string;code?:string}[]=[];
 const requests=source.element_type==='PARTSTUDIO'?
  [['features',`/partstudios/${path}/features?${query}&rollbackBarIndex=-1&includeGeometryIds=true&noSketchGeometry=false`],['parts',`/parts/${path}?${query}`]]:
  source.element_type==='ASSEMBLY'?[['assembly',`/assemblies/${path}?${query}`]]:[];
 if(!requests.length)throw new CadError('UNSUPPORTED_ELEMENT','Unsupported design tab.');
 for(const [kind,endpoint] of requests){
  try{evidence[kind]=await read(endpoint);coverage.push({kind,status:'retrieved'});}
  catch(error){if(error instanceof CadError&&['RECONNECT_REQUIRED','RATE_LIMITED'].includes(error.code))throw error;coverage.push({kind,status:'unavailable',code:error instanceof CadError?error.code:'SOURCE_UNAVAILABLE'});}
 }
 if(!Object.keys(evidence).length)throw new CadError('SOURCE_UNAVAILABLE','No design evidence could be retrieved. No review was performed.',502);
 return {microversion,evidence,coverage};
}
export function inspectEvidence(snapshot:any){
 const features=snapshot.evidence?.features;
 const observations:{anchor:string;kind:string;status:string;name:string}[]=[];
 for(const feature of features?.features??[]){
  if(typeof feature.featureId!=='string')continue;
  const state=features.featureStates?.[feature.featureId];
  observations.push({anchor:feature.featureId,kind:String(feature.featureType||'feature'),status:feature.suppressed?'SUPPRESSED':String(state?.featureStatus||'UNKNOWN'),name:String(feature.name||feature.featureId)});
 }
 return {observations,coverage:snapshot.coverage,limits:['Geometry, fit, strength, wiring and manufacturing suitability have not been checked.','Feature status is reported by Onshape; it is not a full engineering assessment.']};
}
