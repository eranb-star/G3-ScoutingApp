import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import provenance from '../../public/twin/robots/6328-2026/provenance.json';
import config from '../../public/twin/robots/6328-2026/config.json';
import {cloneGeometryObject,disposeObject} from './robotStudioGeometry';
// Exact nodes in the already-distributed, MIT-attributed team export. These are
// team-export representations, not manufacturer dimensional certifications.
export const studioCatalogue=[
 {id:'darwin-drive',node:200,en:'6328 Darwin drivebase',he:'שלדת Darwin של 6328',category:'Chassis'},
 {id:'darwin-kraken-x60',node:384,en:'Kraken X60 · team CAD',he:'Kraken X60 · CAD קבוצתי',category:'Motor'},
 {id:'darwin-kraken-x44',node:46,en:'Kraken X44 · team CAD',he:'Kraken X44 · CAD קבוצתי',category:'Motor'},
 {id:'darwin-bearing',node:15,en:'½ inch hex bearing · team CAD',he:'מיסב משושה ½ אינץ׳ · CAD קבוצתי',category:'Bearing'},
 {id:'darwin-wheel',node:248,en:'SDS MK5 wheel · team CAD',he:'גלגל SDS MK5 · CAD קבוצתי',category:'Wheel'},
 {id:'darwin-jackshaft',node:41,en:'6328 jack shaft · team CAD',he:'ציר ביניים של 6328 · CAD קבוצתי',category:'Shaft'},
 {id:'darwin-screw',node:62,en:'#10-32 × ½ inch button screw · team CAD',he:'בורג #10-32 × חצי אינץ׳ · CAD קבוצתי',category:'Hardware'},
 {id:'darwin-breaker',node:216,en:'120A main breaker · team CAD',he:'מפסק ראשי 120A · CAD קבוצתי',category:'Electronics'},
 {id:'darwin-radio',node:491,en:'VH-109 radio · team CAD',he:'רדיו VH-109 · CAD קבוצתי',category:'Electronics'},
] as const;
export const catalogueSource={url:provenance.source,version:provenance.revision,credit:'Mechanical Advantage 6328 · MIT · team CAD export'};
let catalogueBytes:Promise<ArrayBuffer>|null=null;
async function verifiedBytes(){const response=await fetch('/twin/robots/6328-2026/model.glb');if(!response.ok)throw Error('Published model unavailable');const buffer=await response.arrayBuffer();const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',buffer))].map(n=>n.toString(16).padStart(2,'0')).join('');if(hash!==provenance.files['model.glb'].sha256)throw Error('Published model checksum mismatch');return buffer;}
export async function loadCatalogue(key:string){const entry=studioCatalogue.find(x=>x.id===key);if(!entry)throw Error('Unknown catalogue component');if(!catalogueBytes)catalogueBytes=verifiedBytes().catch(e=>{catalogueBytes=null;throw e;});const buffer=await catalogueBytes;const gltf=await new GLTFLoader().parseAsync(buffer.slice(0),'');const model=gltf.scene;
 for(const rotation of config.rotations)model.rotateOnWorldAxis(new T.Vector3(rotation.axis==='x'?1:0,rotation.axis==='y'?1:0,rotation.axis==='z'?1:0),rotation.degrees*Math.PI/180);model.position.fromArray(config.position);model.updateMatrixWorld(true);
 let found:T.Object3D|undefined;model.traverse(o=>{if(gltf.parser.associations.get(o)?.nodes===entry.node)found=o;});if(!found){disposeObject(model);throw Error('Published component not found in pinned model');}
 const clone=cloneGeometryObject(found);clone.matrix.copy(found.matrixWorld);clone.matrix.decompose(clone.position,clone.quaternion,clone.scale);const root=new T.Group();root.add(clone);root.updateMatrixWorld(true);const box=new T.Box3().setFromObject(root),center=box.getCenter(new T.Vector3());clone.position.sub(center);disposeObject(model);return root;
}
