import {newPart,validateShape,type StudioPart} from './robotStudio';

export type ChassisDimensions={length:number;width:number;height:number;member:number;wall:number;pan:number};
/** Outside dimensions in metres. Generated stock, never a vendor drivetrain. */
export function chassisParts(d:ChassisDimensions):StudioPart[]{
 if(!Object.values(d).every(Number.isFinite)||d.length<=2*d.member||d.width<=2*d.member||d.pan<0||d.pan>.05)throw Error('Frame dimensions must leave an opening; pan thickness must be 0–50 mm.');
 const root=newPart('panel');Object.assign(root,{name:'Concept chassis',shape:null,group:true,note:'Generated frame; mounting, material properties and drivetrain compatibility require review.'});
 const beam=(name:string,length:number,position:[number,number,number],rotation:[number,number,number])=>{const p=newPart('boxTube');p.name=name;p.parent=root.id;p.shape={...p.shape!,width:d.member,height:d.height,length,wall:d.wall};p.position=position;p.rotation=rotation;p.material='Aluminium — density unspecified';validateShape(p.shape);return p;};
 const parts=[root,beam('Left frame rail',d.length,[0,d.width/2-d.member/2,d.height/2],[0,Math.PI/2,Math.PI/2]),beam('Right frame rail',d.length,[0,-d.width/2+d.member/2,d.height/2],[0,Math.PI/2,Math.PI/2]),beam('Front crossmember',d.width-2*d.member,[d.length/2-d.member/2,0,d.height/2],[Math.PI/2,0,0]),beam('Rear crossmember',d.width-2*d.member,[-d.length/2+d.member/2,0,d.height/2],[Math.PI/2,0,0])];
 if(d.pan>0){const p=newPart('panel');p.name='Belly pan';p.parent=root.id;p.shape={...p.shape!,width:d.length,height:d.width,length:d.pan};p.position=[0,0,-d.pan/2];p.material='Unspecified sheet';validateShape(p.shape);parts.push(p);}
 return parts;
}
