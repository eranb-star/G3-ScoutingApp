export type ShooterConfig={on:boolean;speed:number;elevation:number;rate:number;height:number};
export const DEFAULT_SHOOTER:ShooterConfig={on:false,speed:5.6,elevation:65,rate:2,height:0.8};
// The distributed 2026 field has RED at negative X and BLUE at positive X.
export const HUB_ALLIANCES=['red','blue'] as const;
export const HUB_X=[-3.644,3.644];
export const HUB_ENTRY_Z=1.83;
export const HUB_APOTHEM=0.53;
export function insideHub(x:number,y:number,margin=0.075){
  for(let i=0;i<6;i++){const angle=i*Math.PI/3;if(x*Math.cos(angle)+y*Math.sin(angle)>HUB_APOTHEM-margin)return false;}
  return true;
}

export type Vector3={x:number;y:number;z:number};
export type Quaternion=Vector3&{w:number};
export function rotateVector(q:Quaternion,x:number,y:number,z:number):Vector3 {
 const tx=2*(q.y*z-q.z*y),ty=2*(q.z*x-q.x*z),tz=2*(q.x*y-q.y*x);
 return {x:x+q.w*tx+q.y*tz-q.z*ty,y:y+q.w*ty+q.z*tx-q.x*tz,z:z+q.w*tz+q.x*ty-q.y*tx};
}
export function muzzleOffset(q:Quaternion,length:number,height:number){return rotateVector(q,length/2+.09,0,Math.max(.3,Math.min(1.5,height))-.3);}
