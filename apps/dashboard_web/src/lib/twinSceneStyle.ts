import * as THREE from 'three';

/** Local procedural asset: deterministic, no downloads or source-material mutations. */
export function carpetTexture(){
 const size=512,data=new Uint8Array(size*size*4);let seed=6740;
 // Fine mottled pile, with short interlocking fibres rather than a regular grid.
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=seed>>>26,grain=Math.sin(x*.7+y*.43)*5,shade=Math.round(166+noise*.65+grain);data.set([shade,shade,shade,255],(y*size+x)*4);}
 const texture=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);
 texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(1,1);
 texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;
 return texture;
}

export function styleReferenceModel(model:THREE.Object3D,carpet:THREE.Texture){
 model.traverse(o=>{
  if(!(o instanceof THREE.Mesh))return;
  const carpetMesh=/Playing.Field.Carpet/i.test(o.name);
  const rubber=/Stealth.Wheel|Timing.Belt|Tire|Tyre|Bumper/i.test(o.name);
  const metal=/Side.Plate|End.Plate|Steel|Aluminum|Aluminium|Brace.Shaft|Churro/i.test(o.name);
  if(!carpetMesh&&!rubber&&!metal)return;
  const mapped=(Array.isArray(o.material)?o.material:[o.material]).map(source=>{
   if(!(source instanceof THREE.MeshStandardMaterial))return source;
   if(!carpetMesh&&!rubber&&source.color.getHSL({h:0,s:0,l:0}).s>.18)return source;
   const m=source.clone();
   if(carpetMesh){m.color.set('#777570');m.map=carpet;m.bumpMap=carpet;m.bumpScale=.0008;m.roughness=1;m.metalness=0;m.envMapIntensity=.12;}
   else if(rubber){m.roughness=.92;m.metalness=0;m.envMapIntensity=.25;}
   else{m.roughness=.42;m.metalness=.65;m.envMapIntensity=.65;}
   return m;
  });
  o.material=Array.isArray(o.material)?mapped:mapped[0];
 });
}

/** Project only carpet UVs in metres after the CAD coordinate transform. Tape stays intact. */
export function mapCarpetInMetres(model:THREE.Object3D){
 model.updateMatrixWorld(true);const point=new THREE.Vector3();
 model.traverse(o=>{if(!(o instanceof THREE.Mesh)||!/Playing.Field.Carpet/i.test(o.name))return;
  o.geometry=o.geometry.clone();const positions=o.geometry.getAttribute('position'),uv=new Float32Array(positions.count*2);
  for(let i=0;i<positions.count;i++){point.fromBufferAttribute(positions,i).applyMatrix4(o.matrixWorld);uv[i*2]=point.x*2;uv[i*2+1]=point.y*2;}
  o.geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));
 });
}

export {intakePresentation} from './intakeGeometry';
