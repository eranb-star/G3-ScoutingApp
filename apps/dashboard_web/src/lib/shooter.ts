export type ShooterConfig={on:boolean;speed:number;elevation:number;rate:number;height:number};
export const DEFAULT_SHOOTER:ShooterConfig={on:false,speed:5.6,elevation:65,rate:2,height:0.8};
export const HUB_X=[-3.644,3.644];
export const HUB_ENTRY_Z=1.83;
export const HUB_APOTHEM=0.53;
export function insideHub(x:number,y:number,margin=0.075){
  for(let i=0;i<6;i++){const angle=i*Math.PI/3;if(x*Math.cos(angle)+y*Math.sin(angle)>HUB_APOTHEM-margin)return false;}
  return true;
}
