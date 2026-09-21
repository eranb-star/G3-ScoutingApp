import * as THREE from 'three';

/** Local procedural asset: deterministic, no downloads or source-material mutations. */
export function carpetTexture(){
 const size=128,data=new Uint8Array(size*size*4);let seed=6740;
 for(let i=0;i<size*size;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const shade=160+(seed>>>27);data.set([shade,shade,shade,255],i*4);}
 const texture=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);
 texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(96,48);
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
   if(carpetMesh){m.color.set('#727780');m.map=carpet;m.roughness=1;m.metalness=0;m.envMapIntensity=.12;}
   else if(rubber){m.roughness=.92;m.metalness=0;m.envMapIntensity=.25;}
   else{m.roughness=.42;m.metalness=.65;m.envMapIntensity=.65;}
   return m;
  });
  o.material=Array.isArray(o.material)?mapped:mapped[0];
 });
}

/** Reference frame front is x=.333 m, bumper top z=.169 m in renderer coordinates. */
export function intakePresentation(length:number,reach:number,reference:boolean){
 const mountX=reference ? .30 : length*.35;
 const pivotX=reference ? .35 : length/2-.04;
 const pivotZ=.28,rollerX=length/2+reach,rollerZ=.09;
 return {mountX,pivotX,pivotZ,rollerX,rollerZ,span:Math.hypot(rollerX-pivotX,pivotZ-rollerZ),angle:Math.atan2(pivotZ-rollerZ,rollerX-pivotX)};
}
