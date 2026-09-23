import {muzzleOffset,rotateVector} from './shooter';
import R from '@dimforge/rapier3d-compat';
import {DT} from './conceptTwin';
import {HUB_X,HUB_ENTRY_Z,insideHub,ShooterConfig} from './shooter';
import {BallPose,FUEL_RADIUS,IntakeConfig} from './intake';

export type FuelVisualEvent={sequence:number;kind:'capture'|'shot';id:number;tick:number;local:{x:number;y:number;z:number};count:number};

/** Ball identity is conserved across field, storage, hub processing and outposts. */
export class FuelPhysics {
  balls = new Map<number,R.RigidBody>();
  private actor='player';
  private inventories=new Map<string,{stored:number[];shots:number;nextCapture:number;nextShot:number}>([['player',{stored:[],shots:0,nextCapture:0,nextShot:0}]]);
  private inventory(){let i=this.inventories.get(this.actor);if(!i){i={stored:[],shots:0,nextCapture:0,nextShot:0};this.inventories.set(this.actor,i);}return i;}
  get stored(){return this.inventory().stored;}set stored(v:number[]){this.inventory().stored=v;}
  get shots(){return this.inventory().shots;}set shots(v:number){this.inventory().shots=v;}
  private get nextCapture(){return this.inventory().nextCapture;}private set nextCapture(v:number){this.inventory().nextCapture=v;}
  private get nextShot(){return this.inventory().nextShot;}private set nextShot(v:number){this.inventory().nextShot=v;}
  withActor<T>(id:string,action:()=>T):T{const previous=this.actor;this.actor=id;try{return action();}finally{this.actor=previous;}}
  private owners=new Map<number,string>();credits=new Map<string,number>();
  prepareOpponent(){if(this.inventories.has('computer'))return;this.withActor('computer',()=>{this.inventory();for(const id of [...this.balls.keys()].slice(0,8)){this.remove(id);this.owners.delete(id);this.stored.push(id);}});}
  releaseOpponent(p:{x:number;y:number;z:number}){const i=this.inventories.get('computer');if(i)i.stored.forEach((id,n)=>this.spawn(id,{x:p.x+(n%3)*.16,y:p.y+Math.floor(n/3)*.16,z:p.z+.3}));this.inventories.delete('computer');}
  clearForces(){for(const b of this.balls.values())b.resetForces(false);}

  visualEpoch=0;visualSequence=0;visualEvents:FuelVisualEvent[]=[];
  private visualEvent(event:Omit<FuelVisualEvent,'sequence'>){if(this.actor!=='player')return;this.visualEvents.push({...event,sequence:++this.visualSequence});if(this.visualEvents.length>64)this.visualEvents.shift();}
  outposts:number[][]=[[],[]];
  transit:{id:number;hub:number;ready:number}[]=[];
  outOfPlay:number[]=[];
  scores=[0,0];total=0;
  get collected(){return this.stored.length;}

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
    this.inventories.clear();this.owners.clear();this.credits.clear();
    this.visualEpoch++;this.visualSequence=0;this.visualEvents=[];
    this.stored=[];this.outposts=[[],[]];this.transit=[];this.outOfPlay=[];this.scores=[0,0];this.shots=0;this.nextCapture=0;this.nextShot=0;
    this.total=points?points.length:total;
    if(points){points.forEach((p,id)=>this.spawn(id,{...p,z:FUEL_RADIUS+0.005}));return;}
    // One robot has eight preloads. The absent five robots' unused preloads
    // are placed in neutral, as specified by the match staging rule.
    let id=0;const neutral=total-104;
    // Single layer: no unsupported balls falling when driving is enabled.
    for(let i=0;i<neutral;i++){
      const side=i%2===0?-1:1,j=Math.floor(i/2);
      this.spawn(id++,{x:side*(0.101+(j%6)*0.151),y:-2.49+Math.floor(j/6)*0.151,z:FUEL_RADIUS}).sleep();
    }
    for(const side of [-1,1])for(let i=0;i<24;i++)this.spawn(id++,{x:side*(7.80+(i%3)*0.153),y:-side*1.9304+(Math.floor(i/3)%6-2.5)*0.153,z:.075+Math.floor(i/18)*.15}).sleep();
    for(let i=0;i<8;i++)this.stored.push(id++);
    for(let h=0;h<2;h++)for(let i=0;i<24;i++)this.outposts[h].push(id++);
  }

  shoot(robot:R.RigidBody,length:number,tick:number,shooter:ShooterConfig){
    if(!shooter.on||!this.stored.length||tick<this.nextShot)return;
    if(![shooter.speed,shooter.elevation,shooter.rate,shooter.height].every(Number.isFinite)||shooter.rate<=0)return;
    const p=robot.translation(),q=robot.rotation();
    const rotate=(x:number,y:number,z:number)=>rotateVector(q,x,y,z);
    const muzzle=muzzleOffset(q,length,shooter.height,shooter.yaw);
    const angle=Math.max(15,Math.min(80,shooter.elevation))*Math.PI/180,speed=Math.max(2,Math.min(18,shooter.speed)),v=rotate(speed*Math.cos(angle)*Math.cos((shooter.yaw??0)*Math.PI/180),speed*Math.cos(angle)*Math.sin((shooter.yaw??0)*Math.PI/180),speed*Math.sin(angle)),rv=robot.velocityAtPoint({x:p.x+muzzle.x,y:p.y+muzzle.y,z:p.z+muzzle.z});
    const id=this.stored.shift()!;this.visualEvent({kind:'shot',id,tick,local:{x:(length/2+.09)*Math.cos((shooter.yaw??0)*Math.PI/180),y:(length/2+.09)*Math.sin((shooter.yaw??0)*Math.PI/180),z:shooter.height},count:this.stored.length+1});
    this.spawn(id,{x:p.x+muzzle.x,y:p.y+muzzle.y,z:p.z+muzzle.z},{x:v.x+rv.x,y:v.y+rv.y,z:v.z+rv.z});
    this.owners.set(id,this.actor);this.shots++;this.nextShot=tick+Math.ceil(1/(Math.min(8,shooter.rate)*DT));
  }

  afterStep(tick:number){
    for(const [id,body] of this.balls){
      const p=body.translation(),last=this.previous.get(id);
      let scored=false;
      if(last&&last.z>=HUB_ENTRY_Z&&p.z<HUB_ENTRY_Z){
        const t=(last.z-HUB_ENTRY_Z)/(last.z-p.z),x=last.x+(p.x-last.x)*t,y=last.y+(p.y-last.y)*t;
        for(let h=0;h<2;h++)if(insideHub(x-HUB_X[h],y)){
          this.remove(id);this.scores[h]++;const owner=this.owners.get(id);if(owner)this.credits.set(owner,(this.credits.get(owner)??0)+1);this.owners.delete(id);this.transit.push({id,hub:h,ready:tick+60});scored=true;break;
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
  ledger(){return {field:this.balls.size,stored:[...this.inventories.values()].reduce((n,i)=>n+i.stored.length,0),hub:this.transit.length,outposts:this.outposts[0].length+this.outposts[1].length,outOfPlay:this.outOfPlay.length,total:this.total};}

  capture(robot:R.RigidBody,length:number,tick:number,intake:IntakeConfig) {
    if(!intake.on||this.collected>=intake.capacity) return;
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
      if(forward<length/2||forward>length/2+intake.reach+.075||Math.abs(lateral)>intake.width/2-FUEL_RADIUS-.018||height<0||height>0.22||Math.hypot(bv.x-rv.x,bv.y-rv.y)>3) continue;
      // Reject capture through a field solid or another ball.
      const rayOrigin={x:p.x+c*(length/2+0.01),y:p.y+s*(length/2+0.01),z:b.z};
      const delta={x:b.x-rayOrigin.x,y:b.y-rayOrigin.y,z:0},distance=Math.hypot(delta.x,delta.y);
      if(distance>0.001){const hit=this.world.castRay(new R.Ray(rayOrigin,{x:delta.x/distance,y:delta.y/distance,z:0}),distance,true,undefined,undefined,undefined,robot);if(hit&&hit.collider.parent()?.handle!==body.handle)continue;}
      // Pull the ball along the actual under-roller path. Storage begins only at the throat.
      const targetSpeed=-1.1,relative=(bv.x-rv.x)*c+(bv.y-rv.y)*s;
      const force=Math.max(-8,Math.min(8,(targetSpeed-relative)*3));
      body.addForce({x:c*force,y:s*force,z:0},true);
      body.setAngvel({x:s*1.1/FUEL_RADIUS,y:-c*1.1/FUEL_RADIUS,z:0},true);
      if(forward>length/2+.105||tick<this.nextCapture)continue;
      const local=rotateVector({x:-q.x,y:-q.y,z:-q.z,w:q.w},b.x-p.x,b.y-p.y,b.z-p.z);local.z+=.3;
      this.visualEvent({kind:'capture',id,tick,local,count:this.stored.length+1});
      this.remove(id);this.owners.delete(id);this.stored.push(id);
      this.nextCapture=tick+Math.ceil(1/(Math.min(10,intake.rate)*DT));
      break;
    }
  }

  snapshot():BallPose[] {return Array.from(this.balls,([id,body])=>({id,...body.translation()}));}
}
