import {readBuildPages} from './robotBuildWorkspace';
import * as T from 'three';
import {loadCatalogue} from './robotStudioCatalogue';
import {supabase} from '../supabase';
import {loadUpload,onshapeObject,disposeObject,extractComponent} from './robotStudioGeometry';
import {validateScene,type StudioAsset,type StudioScene} from './robotStudio';
export type SavedStudio={id:string;name:string;owner_id:string;revision:number;document:StudioScene;updated_at:string};
export async function studioList(){return readBuildPages<Omit<SavedStudio,'document'>>((a,z)=>supabase.from('robot_studio_scenes').select('id,name,owner_id,revision,updated_at').order('updated_at',{ascending:false}).order('id').range(a,z));}
export async function studioOpen(id:string){const r=await supabase.from('robot_studio_scenes').select('*').eq('id',id).single();if(r.error)throw r.error;if(!r.data)throw Error('Design not found or access is unavailable');validateScene(r.data.document);return r.data as SavedStudio;}
export async function studioSave(id:string,expected:number,document:StudioScene,request:string,client:string){validateScene(document);const r=await supabase.rpc('save_robot_studio',{p_id:id,p_expected:expected,p_document:document,p_request:request,p_client:client});if(r.error)throw r.error;return r.data as number;}
export async function cadCall(action:string,values:Record<string,unknown>={}){const r=await supabase.functions.invoke('onshape-connector',{body:{action,...values}});if(r.error||r.data?.error)throw Error(r.data?.error||r.error?.message||'CAD request failed');return r.data;}
export async function studioLoadAsset(asset:StudioAsset):Promise<T.Object3D>{
 const root=await loadFullAsset(asset);if(!asset.nodePath?.length)return root;
 try{return extractComponent(root,asset.nodePath);}finally{disposeObject(root);}
}
async function loadFullAsset(asset:StudioAsset):Promise<T.Object3D>{
 if(asset.kind==='onshape'){
  const approved=await supabase.from('robot_studio_cad_library').select('asset_path').eq('snapshot_id',asset.snapshotId!).is('revoked_at',null).maybeSingle();
  if(approved.data){const file=await supabase.storage.from('cad-design-assets').download(approved.data.asset_path);if(file.error)throw file.error;return onshapeObject(JSON.parse(await file.data.text()));}
 }
 if(asset.kind==='catalogue')return loadCatalogue(asset.catalogueId!);
 if(asset.kind==='onshape'){const r=await cadCall('geometry',{sourceId:asset.sourceId,snapshotId:asset.snapshotId});const url=new URL(r.url);if(url.origin!=='https://hnqwhuuxlqfyawqymaaz.supabase.co'||!url.pathname.startsWith('/storage/v1/object/sign/cad-design-assets/'))throw Error('Invalid CAD asset destination');const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw Error('CAD geometry unavailable');return onshapeObject(await response.json());}
 const result=await supabase.storage.from('robot-studio-assets').download(asset.path!);if(result.error)throw result.error;return loadUpload(await result.data.arrayBuffer(),asset.format!,asset.scale);
}
export async function studioUpload(file:File,owner:string,scale:number,attribution:string,sourceUrl:string):Promise<{asset:StudioAsset;object:T.Object3D}>{
 const format=file.name.toLowerCase().split('.').pop();if(format!=='glb'&&format!=='stl')throw Error('Choose a self-contained GLB or STL');if(file.size>40*1024*1024)throw Error('Maximum file size is 40 MB');
 if(!attribution.trim())throw Error('Record the model source and reuse permission');if(sourceUrl&&!/^https:\/\//.test(sourceUrl))throw Error('Use an HTTPS source link');
 const object=await loadUpload(await file.arrayBuffer(),format,scale);const id=crypto.randomUUID(),path=`${owner}/${id}.${format}`;
 try {
 const uploaded=await supabase.storage.from('robot-studio-assets').upload(path,file,{upsert:false,contentType:'application/octet-stream'});if(uploaded.error)throw uploaded.error;
 const registered=await supabase.rpc('register_robot_studio_asset',{p_path:path,p_name:file.name});if(registered.error)throw registered.error;
 return {object,asset:{id,name:file.name,kind:'upload',path,format,scale,sourceUrl,attribution,coverage:'unverified'}};
 }catch(error){disposeObject(object);throw error;}
}
