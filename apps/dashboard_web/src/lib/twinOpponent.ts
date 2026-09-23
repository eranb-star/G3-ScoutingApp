import type {Command} from './conceptTwin';
import {DEFAULT_SHOOTER,HUB_ENTRY_Z} from './shooter';
import type {BallPose} from './intake';
const clamp=(n:number)=>Math.max(-1,Math.min(1,n));
/** Local practice controller. It does not reproduce a published team's software. */
export function opponentCommand(p:{x:number;y:number;heading:number;speed:number},balls:BallPose[],stored:number,length:number,tick:number,rearShot=false){
 let x=5.7,y=1.55,state='Return to shoot',aim=0,shoot=false;
 if(stored===0){
  const candidates=balls.filter(b=>b.z<.2&&b.x>-.8&&b.x<7.4&&Math.abs(b.y)<3.4);
  candidates.sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y)||a.id-b.id);
  const b=candidates[0];state=b?'Collect':'Wait for fuel';
  if(b){aim=Math.atan2(b.y-p.y,b.x-p.x);x=b.x-Math.cos(aim)*(length/2+.08);y=b.y-Math.sin(aim)*(length/2+.08);}else{x=p.x;y=p.y;aim=p.heading;}
 }
 // Cross the hub line using the ramp lane, clear of hub and low trench roofs.
 if((p.x-3.644)*(x-3.644)<0){if(Math.abs(p.y-1.55)>.25){x=p.x;y=1.55;}else{x=x>3.644?4.7:2.6;y=1.55;}state='Cross ramp';}
 const distance=Math.hypot(x-p.x,y-p.y);
 if(stored>0&&distance<.2){aim=Math.atan2(-p.y,3.644-p.x)-(rearShot?Math.PI:0);state='Aim and shoot';shoot=p.speed<.2;}
 else if(distance>.35)aim=Math.atan2(y-p.y,x-p.x);
 const error=Math.atan2(Math.sin(aim-p.heading),Math.cos(aim-p.heading));
 const command:Command={vx:clamp((x-p.x)*1.4),vy:clamp((y-p.y)*1.4),omega:clamp(error*2)};
 // Brief deterministic steering offset helps recover from contact without teleporting.
 if(p.speed<.03&&distance>.4&&tick%360>270){command.vy=.45;command.vx=-.25;}
 const range=Math.max(.5,Math.hypot(3.644-p.x,p.y)-length/2-.09),angle=65*Math.PI/180;
 const speed=Math.sqrt(9.81*range*range/(2*Math.cos(angle)**2*Math.max(.1,range*Math.tan(angle)-(HUB_ENTRY_Z-.8))));
 return {command,state,intake:stored<8,shooter:{...DEFAULT_SHOOTER,yaw:rearShot?180:0,on:shoot&&Math.abs(error)<.06,speed:Math.max(2,Math.min(18,speed)),elevation:65}};
}
