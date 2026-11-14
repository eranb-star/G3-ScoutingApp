import type {CadGeometry} from '../components/CadDesignViewer';
type Call=(action:string,values:Record<string,unknown>)=>Promise<any>;
export async function readCadAsset(urlValue:string){
 const url=new URL(urlValue);
 if(url.origin!=='https://hnqwhuuxlqfyawqymaaz.supabase.co'||!url.pathname.startsWith('/storage/v1/object/sign/cad-design-assets/'))throw Error('Invalid CAD asset destination');
 const response=await fetch(url,{cache:'no-store'});
 if(!response.ok)throw Error('CAD geometry download failed. Retry to continue saved progress.');
 return response.json();
}
/** Each request imports one distinct part. Repeated occurrences share its data.
 * Server caches successful chunks against the exact snapshot for safe retries. */
export async function loadCadGeometry(call:Call,identity:{sourceId?:string;snapshotId?:string},progress?:(done:number,total:number)=>void):Promise<CadGeometry>{
 const plan=await call('geometry',{...identity,chunked:true});
 if(identity.snapshotId&&plan.snapshotId!==identity.snapshotId)throw Error('CAD revision changed unexpectedly. Retry.');
 if(plan.format!=='assembly-parts-v1')return readCadAsset(plan.url);
 if(!Number.isInteger(plan.partCount)||plan.partCount<1||plan.partCount>500||!Array.isArray(plan.meshes)||plan.meshes.length>1000)throw Error('Unsupported assembly plan');
 const positions:number[][]=new Array(plan.partCount);let next=0,done=0,coordinates=0,failure:unknown;
 progress?.(0,plan.partCount);
 async function worker(){while(!failure){const index=next++;if(index>=plan.partCount)return;
  try{
   const asset=await call('geometry',{...identity,snapshotId:plan.snapshotId,chunked:true,partIndex:index});
   if(asset.snapshotId!==plan.snapshotId||asset.partIndex!==index)throw Error('CAD part revision mismatch');
   const part=await readCadAsset(asset.url);
   if(!Array.isArray(part.positions)||!part.positions.length||part.positions.length%9||part.positions.length>1_800_000||!part.positions.every(Number.isFinite))throw Error('Invalid CAD part geometry');
   coordinates+=part.positions.length;
   if(coordinates>9_000_000)throw Error('This assembly exceeds the interactive geometry budget. Import a subsystem; existing parts are unchanged.');
   positions[index]=part.positions;progress?.(++done,plan.partCount);
  }catch(error){failure=error;return;}
 }}
 await Promise.all([worker(),worker()]);if(failure)throw failure;
 let renderedCoordinates=0;
 const meshes=plan.meshes.map((mesh:any)=>{
  if(!Number.isInteger(mesh.partIndex)||!positions[mesh.partIndex]||!Array.isArray(mesh.transform)||mesh.transform.length!==16||!mesh.transform.every(Number.isFinite))throw Error('Invalid assembly placement');
  renderedCoordinates+=positions[mesh.partIndex].length;
  if(renderedCoordinates>9_000_000)throw Error('This assembly exceeds 3 million displayed vertices. Import a subsystem; existing parts are unchanged.');
  return {id:mesh.id,name:mesh.name,positions:positions[mesh.partIndex],transform:mesh.transform};
 });
 const finalized=await call('geometry',{...identity,snapshotId:plan.snapshotId,chunked:true,finalize:true});
 if(finalized.snapshotId!==plan.snapshotId)throw Error('CAD revision mismatch');
 return {units:'m',meshes,lines:[],coverage:'assembly-geometry'};
}
