import {DT,type Pose} from './conceptTwin';

export const PRACTICE_SECONDS=60;
export type PracticeFrame={pose:Pose;intake:boolean;seconds:number};
export type PracticeResult={seconds:number;scored:number;shots:number;accuracy:number|null;distance:number;complete:boolean;input:string;settings:string};
/** One bounded, in-memory run. Recording is visual state, not physics re-simulation. */
export class PracticeRun{
 frames:PracticeFrame[]=[];steps=0;active=true;result:PracticeResult|null=null;
 constructor(private initial:Pose,public input:string,readonly settings:string){this.initial=structuredClone(initial);this.save(initial,false);}
 get seconds(){return this.steps*DT;}
 private save(pose:Pose,intake:boolean){this.frames.push({pose:structuredClone(pose),intake,seconds:this.seconds});}
 step(pose:Pose,intake:boolean){if(!this.active)return;this.steps++;if(this.steps%6===0)this.save(pose,intake);if(this.steps>=PRACTICE_SECONDS/DT)this.finish(pose,true);}
 finish(pose:Pose,complete=false){if(!this.active)return;this.active=false;if(this.steps%6!==0)this.save(pose,false);const scored=Math.max(0,(pose.playerScored??(pose.scores??[]).reduce((a,b)=>a+b,0))-(this.initial.playerScored??(this.initial.scores??[]).reduce((a,b)=>a+b,0))),shots=Math.max(0,(pose.shots??0)-(this.initial.shots??0));this.result={seconds:this.seconds,scored,shots,accuracy:shots?scored/shots:null,distance:Math.max(0,pose.distance-this.initial.distance),complete,input:this.input,settings:this.settings};}
 frame(seconds:number):PracticeFrame{
  const time=Math.max(0,Math.min(this.seconds,seconds)),i=Math.min(Math.floor(time*10),this.frames.length-1),a=this.frames[i],b=this.frames[Math.min(i+1,this.frames.length-1)],t=b.seconds>a.seconds?Math.min(1,(time-a.seconds)/(b.seconds-a.seconds)):0;
  const lerp=(x:number,y:number)=>x+(y-x)*t,balls=new Map(b.pose.balls?.map(p=>[p.id,p]));
  const heading=a.pose.heading+Math.atan2(Math.sin(b.pose.heading-a.pose.heading),Math.cos(b.pose.heading-a.pose.heading))*t;
  let rotation=a.pose.rotation;
  if(rotation&&b.pose.rotation){const q=b.pose.rotation,sign=rotation.x*q.x+rotation.y*q.y+rotation.z*q.z+rotation.w*q.w<0?-1:1;const x=lerp(rotation.x,q.x*sign),y=lerp(rotation.y,q.y*sign),z=lerp(rotation.z,q.z*sign),w=lerp(rotation.w,q.w*sign),n=Math.hypot(x,y,z,w)||1;rotation={x:x/n,y:y/n,z:z/n,w:w/n};}
  return {seconds:time,intake:a.intake,pose:{...a.pose,x:lerp(a.pose.x,b.pose.x),y:lerp(a.pose.y,b.pose.y),z:lerp(a.pose.z??0,b.pose.z??0),heading,rotation,opponent:a.pose.opponent&&b.pose.opponent?{...a.pose.opponent,x:lerp(a.pose.opponent.x,b.pose.opponent.x),y:lerp(a.pose.opponent.y,b.pose.opponent.y),z:lerp(a.pose.opponent.z,b.pose.opponent.z)}:a.pose.opponent,balls:a.pose.balls?.map(p=>{const next=balls.get(p.id);return next?{...p,x:lerp(p.x,next.x),y:lerp(p.y,next.y),z:lerp(p.z??0,next.z??0)}:p;})}};
 }
}
