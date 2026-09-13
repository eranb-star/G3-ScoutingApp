// Bounded, browser-local asset cache. Public reference models only.
export const TWIN_CACHE='g3-twin-models-v4';
export const CACHE_LIMIT=80*1024*1024;
let writes:Promise<void>=Promise.resolve();
export function storeModel(cache:Cache,url:string,data:ArrayBuffer){
 const write=async()=>{const keys=await cache.keys();const entries=await Promise.all(keys.map(async key=>{const r=await cache.match(key);return {key,bytes:Number(r?.headers.get('x-model-bytes')??0),used:Number(r?.headers.get('x-model-used')??0)};}));let total=entries.reduce((n,e)=>n+e.bytes,0);for(const e of entries.sort((a,b)=>a.used-b.used)){if(e.key.url===new URL(url,location.href).href||total+data.byteLength>CACHE_LIMIT){await cache.delete(e.key);total-=e.bytes;}}if(data.byteLength>CACHE_LIMIT)return;await cache.put(url,new Response(data,{headers:{'Content-Type':'model/gltf-binary','x-model-bytes':String(data.byteLength),'x-model-used':String(Date.now())}}));};
 const pending=writes.then(write);writes=pending.catch(()=>{});return pending;
}
export async function cacheSummary(){if(!('caches' in window))return 'Browser cache unavailable';const cache=await caches.open(TWIN_CACHE),keys=await cache.keys();const sizes=await Promise.all(keys.map(async k=>Number((await cache.match(k))?.headers.get('x-model-bytes')??0)));return `${(sizes.reduce((a,b)=>a+b,0)/1024/1024).toFixed(1)} / 80 MB cached · least recently used models removed automatically`;}
