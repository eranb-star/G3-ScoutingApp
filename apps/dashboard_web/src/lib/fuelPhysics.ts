import R from '@dimforge/rapier3d-compat';
import {DT} from './conceptTwin';
import {HUB_X,HUB_ENTRY_Z,insideHub,ShooterConfig} from './shooter';
import {BallPose,FUEL_RADIUS,IntakeConfig} from './intake';

/** Ball identity is conserved across field, storage, hub processing and outposts. */
export class FuelPhysics {
  balls = new Map<number,R.RigidBody>();
  stored:number[]=[];
  outposts:number[][]=[[],[]];
  transit:{id:number;hub:number;ready:number}[]=[];
  outOfPlay:number[]=[];
  scores=[0,0];shots=0;total=0;
  get collected(){return this.stored.length;}
  private nextCapture=0;private nextShot=0;
  private previous=new Map<number,{x:number;y:number;z:number}>();
  constructor(private world:R.World) {}

  spawn(id:number,p:{x:number;y:number;z:number},velocity={x:0,y:0,z:0}) {
    const body=this.world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(p.x,p.y,p.z).setCcdEnabled(true).setLinearDamping(0.015).setAngularDamping(0.5));
    this.world.createCollider(R.ColliderDesc.ball(FUEL_RADIUS).setMass(0.215).setFriction(0.65).setRestitution(0.3).setCollisionGroups((2<<16)|7),body);
    body.setLinvel(velocity,true);this.balls.set(id,body);this.previous.set(id,{...p});return body;
  }
  private remove(id:number){const body=this.balls.get(id);if(body)this.world.removeRigidBody(body);this.balls.delete(id);this.previous.delete(id);}
  reset(points?:{x:number;y:number}[],total=504) {
    for(const id of this.balls.keys())this.remove(id);
    this.stored=[];this.outposts=[[],[]];this.transit=[];this.outOfPlay=[];this.scores=[0,0];this.shots=0;this.nextCapture=0;this.nextShot=0;
    this.total=points?points.length:total;
    if(points){points.forEach((p,id)=>this.spawn(id,{...p,z:FUEL_RADIUS+0.005}));return;}
    // One robot has eight preloads. The absent five robots' unused preloads
    // are placed in neutral, as specified by the match staging rule.
    let id=0;const neutral=total-104;
    // Two packed blocks separated by the centre divider. Additional balls form
    // a staggered second layer; never spawn overlapping spheres.
    for(let i=0;i<neutral;i++){
      const side=i%2===0?-1:1,j=Math.floor(i/2),layer=Math.floor(j/170),k=j%170;
      this.spawn(id++,{x:side*(0.102+(k%5)*0.153+layer*0.07),y:-2.525+Math.floor(k/5)*0.153+layer*0.02,z:0.075+layer*0.15});
    }
    for(const side of [-1,1])for(let i=0;i<24;i++)this.spawn(id++,{x:side*(7.80+(i%3)*0.153),y:-side*1.9304+(Math.floor(i/3)%6-2.5)*0.153,z:.075+Math.floor(i/18)*.153});
    for(let i=0;i<8;i++)this.stored.push(id++);
    for(let h=0;h<2;h++)for(let i=0;i<24;i++)this.outposts[h].push(id++);
  }

  shoot(robot:R.RigidBody,length:number,tick:number,shooter:ShooterConfig){
    if(!shooter.on||!this.stored.length||tick<this.nextShot)return;
    if(![shooter.speed,shooter.elevation,shooter.rate,shooter.height].every(Number.isFinite)||shooter.rate<=0)return;
    const p=robot.translation(),q=robot.rotation();
    const rotate=(x:number,y:number,z:number)=>{const tx=2*(q.y*z-q.z*y),ty=2*(q.z*x-q.x*z),tz=2*(q.x*y-q.y*x);return {x:x+q.w*tx+q.y*tz-q.z*ty,y:y+q.w*ty+q.z*tx-q.x*tz,z:z+q.w*tz+q.x*ty-q.y*tx};};
    const muzzle=rotate(length/2+.09,0,Math.max(.3,Math.min(1.5,shooter.height))-.3);
    const angle=Math.max(15,Math.min(80,shooter.elevation))*Math.PI/180,speed=Math.max(2,Math.min(18,shooter.speed)),v=rotate(speed*Math.cos(angle),0,speed*Math.sin(angle)),rv=robot.velocityAtPoint({x:p.x+muzzle.x,y:p.y+muzzle.y,z:p.z+muzzle.z});
    this.spawn(this.stored.shift()!,{x:p.x+muzzle.x,y:p.y+muzzle.y,z:p.z+muzzle.z},{x:v.x+rv.x,y:v.y+rv.y,z:v.z+rv.z});
    this.shots++;this.nextShot=tick+Math.ceil(1/(Math.min(8,shooter.rate)*DT));
  }

  afterStep(tick:number){
    for(const [id,body] of this.balls){
      const p=body.translation(),last=this.previous.get(id);
      let scored=false;
      if(last&&last.z>=HUB_ENTRY_Z&&p.z<HUB_ENTRY_Z){
        const t=(last.z-HUB_ENTRY_Z)/(last.z-p.z),x=last.x+(p.x-last.x)*t,y=last.y+(p.y-last.y)*t;
        for(let h=0;h<2;h++)if(insideHub(x-HUB_X[h],y)){
          this.remove(id);this.scores[h]++;this.transit.push({id,hub:h,ready:tick+60});scored=true;break;
        }
      }
      if(scored)continue;
      if(p.z < -0.5 || Math.abs(p.x)>8.7 || Math.abs(p.y)>4.45){this.remove(id);this.outOfPlay.push(id);continue;}
      body.setLinearDamping(p.z<0.16?0.35:0.015);this.previous.set(id,{...p});
    }
    const due=this.transit.filter(t=>t.ready<=tick);this.transit=this.transit.filter(t=>t.ready>tick);
    for(const item of due){
      const toward=item.hub===0?1:-1,outlet=(item.id+this.scores[item.hub])%4,y=[-.36,-.12,.12,.36][outlet];
      this.spawn(item.id,{x:HUB_X[item.hub]+toward*.73,y,z:.16},{x:toward*(1.4+(item.id%7)*.08),y:y*1.5,z:.45});
    }
  }
  feedOutpost(hub:number){const id=this.outposts[hub]?.shift();if(id===undefined)return;const side=hub===0?-1:1;this.spawn(id,{x:side*7.95,y:side*3.45,z:.8},{x:-side*1.5,y:0,z:0});}
  recoverOutOfPlay(){this.outposts[0].push(...this.outOfPlay);this.outOfPlay=[];}
  ledger(){return {field:this.balls.size,stored:this.collected,hub:this.transit.length,outposts:this.outposts[0].length+this.outposts[1].length,outOfPlay:this.outOfPlay.length,total:this.total};}

  capture(robot:R.RigidBody,length:number,tick:number,intake:IntakeConfig) {
    if(!intake.on||this.collected>=intake.capacity||tick<this.nextCapture) return;
    if(![intake.capacity,intake.rate,intake.width,intake.reach].every(Number.isFinite)||intake.rate<=0) return;
    const p=robot.translation(),q=robot.rotation();
    // Don't collect while overturned; capture volume follows the robot heading.
    if(1-2*(q.x*q.x+q.y*q.y)<0.8) return;
    const heading=Math.atan2(2*(q.w*q.z+q.x*q.y),1-2*(q.y*q.y+q.z*q.z));
    const c=Math.cos(heading),s=Math.sin(heading);
    for(const [id,body] of this.balls) {
      const b=body.translation(),dx=b.x-p.x,dy=b.y-p.y;
      const forward=dx*c+dy*s,lateral=-dx*s+dy*c;
      const height=b.z-(p.z-0.3);
      const bv=body.linvel(),rv=robot.linvel();
      if(forward<length/2||forward>length/2+intake.reach||Math.abs(lateral)>intake.width/2||height<0||height>0.22||Math.hypot(bv.x-rv.x,bv.y-rv.y)>3) continue;
      // Reject capture through a field solid or another ball.
      const rayOrigin={x:p.x+c*(length/2+0.01),y:p.y+s*(length/2+0.01),z:b.z};
      const delta={x:b.x-rayOrigin.x,y:b.y-rayOrigin.y,z:0},distance=Math.hypot(delta.x,delta.y);
      if(distance>0.001){const hit=this.world.castRay(new R.Ray(rayOrigin,{x:delta.x/distance,y:delta.y/distance,z:0}),distance,true,undefined,undefined,undefined,robot);if(hit&&hit.collider.parent()?.handle!==body.handle)continue;}
      this.remove(id);this.stored.push(id);
      this.nextCapture=tick+Math.ceil(1/(Math.min(10,intake.rate)*DT));
      break;
    }
  }

  snapshot():BallPose[] {return Array.from(this.balls,([id,body])=>({id,...body.translation()}));}
}
