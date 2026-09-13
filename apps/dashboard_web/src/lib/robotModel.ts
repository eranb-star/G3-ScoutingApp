export type RobotModel={name:string;data:ArrayBuffer;scale:number;rotation:number};
export function validateGlb(data:ArrayBuffer){
 if(data.byteLength<20||data.byteLength>40*1024*1024)throw Error('Use a GLB file under 40 MB.');
 const v=new DataView(data);if(v.getUint32(0,true)!==0x46546c67||v.getUint32(4,true)!==2||v.getUint32(8,true)!==data.byteLength||v.getUint32(16,true)!==0x4e4f534a)throw Error('Invalid GLB 2.0 file.');
 const length=v.getUint32(12,true);if(length>data.byteLength-20)throw Error('Invalid GLB header.');
 const json=JSON.parse(new TextDecoder().decode(data.slice(20,20+length)));
 if([...(json.buffers??[]),...(json.images??[])].some(x=>x.uri))throw Error('Use a self-contained GLB with embedded buffers and textures.');
 if((json.extensionsRequired??[]).length)throw Error('Export an uncompressed GLB without required extensions.');
}
async function database(){return new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('g3-robot-model',1);r.onupgradeneeded=()=>r.result.createObjectStore('models');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
export async function savedRobot(write?:RobotModel|null):Promise<RobotModel|undefined>{const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('models',write===undefined?'readonly':'readwrite'),s=tx.objectStore('models');const r=write===undefined?s.get('selected'):write===null?s.delete('selected'):s.put(write,'selected');tx.oncomplete=()=>{db.close();resolve(write===undefined?r.result:undefined);};tx.onerror=()=>{db.close();reject(tx.error);};});}
