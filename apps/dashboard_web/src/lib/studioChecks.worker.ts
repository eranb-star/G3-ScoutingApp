import {checkMeshes,type CheckMesh} from './studioChecks';
self.onmessage=(event:MessageEvent<{request:number;meshes:CheckMesh[]}>)=>{try{self.postMessage({request:event.data.request,result:checkMeshes(event.data.meshes)});}catch{self.postMessage({request:event.data.request,error:'Geometry check failed'});}};
