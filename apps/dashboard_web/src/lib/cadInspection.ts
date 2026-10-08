import * as THREE from 'three';

// Infer a display plane only when every supplied point lies on it. No geometry
// is flattened, discarded or inferred from the apparent camera orientation.
export function inspectionPlane(positions: number[]): THREE.Vector3 | null {
 if(positions.length<9)return null;
 const origin=new THREE.Vector3().fromArray(positions),axis=new THREE.Vector3(),candidate=new THREE.Vector3();
 let extent=0;
 for(let i=3;i<positions.length;i+=3){candidate.fromArray(positions,i).sub(origin);if(candidate.lengthSq()>extent){extent=candidate.lengthSq();axis.copy(candidate);}}
 if(extent<1e-20)return null;
 const normal=new THREE.Vector3(),cross=new THREE.Vector3();let area=0;
 for(let i=3;i<positions.length;i+=3){cross.crossVectors(axis,candidate.fromArray(positions,i).sub(origin));if(cross.lengthSq()>area){area=cross.lengthSq();normal.copy(cross);}}
 if(area<extent*extent*1e-12)return null;
 normal.normalize();
 for(let i=0;i<positions.length;i+=3)if(Math.abs(candidate.fromArray(positions,i).sub(origin).dot(normal))>Math.max(Math.sqrt(extent)*1e-6,1e-8))return null;
 // Stable front-facing convention: a typical XZ sketch is viewed from -Y.
 const dominant=['x','y','z'].sort((a,b)=>Math.abs(normal[b as 'x'])-Math.abs(normal[a as 'x']))[0] as 'x'|'y'|'z';
 if(normal[dominant]*(dominant==='y'?-1:1)<0)normal.negate();
 return normal;
}

export function inspectionUp(direction:THREE.Vector3){
 const up=new THREE.Vector3(0,0,1);
 if(Math.abs(up.dot(direction))>.99)up.set(0,1,0);
 return up.addScaledVector(direction,-up.dot(direction)).normalize();
}
