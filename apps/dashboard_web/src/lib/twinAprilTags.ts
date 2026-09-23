import * as THREE from 'three';
import layout from '../../public/twin/2026/tags/layout-welded.json';
/** Official WPILib blue-corner frame -> bundled CAD centered red-wall frame. */
export const APRIL_TAGS_2026=layout.tags.map(t=>({id:t.ID,x:layout.field.length/2-t.pose.translation.x,y:layout.field.width/2-t.pose.translation.y,z:t.pose.translation.z,yaw:Math.PI+2*Math.atan2(t.pose.rotation.quaternion.Z,t.pose.rotation.quaternion.W)}));
export const TAG_BLACK_SIZE=.1651;
export function aprilTags2026(){
 const group=new THREE.Group();group.name='Official 2026 welded field AprilTags';
 const loader=new THREE.TextureLoader();
 for(const t of APRIL_TAGS_2026){
  const texture=loader.load(`/twin/2026/tags/${t.id}.png`);texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=THREE.NearestFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;
  const m=new THREE.Mesh(new THREE.PlaneGeometry(TAG_BLACK_SIZE*10/8,TAG_BLACK_SIZE*10/8),new THREE.MeshBasicMaterial({map:texture,side:THREE.FrontSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));
  // Plane local right = field tangential direction; local up = +Z; normal = tag +X.
  m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(-Math.sin(t.yaw),Math.cos(t.yaw),0),new THREE.Vector3(0,0,1),new THREE.Vector3(Math.cos(t.yaw),Math.sin(t.yaw),0)));
  m.position.set(t.x,t.y,t.z);m.name=`AprilTag ${t.id}`;group.add(m);
 }
 return group;
}
