import R from '@dimforge/rapier3d-compat';
import {DT} from './conceptTwin';
import {BallPose,FUEL_RADIUS,IntakeConfig} from './intake';

/** Bounded training layout, not the official match starting distribution. */
export class FuelPhysics {
  balls = new Map<number,R.RigidBody>();
  collected = 0;
  private nextCapture = 0;
  constructor(private world:R.World) {}

  reset(points = Array.from({length:64},(_,i)=>({x:-1.5+(i%8)*0.4,y:-1.4+Math.floor(i/8)*0.4}))) {
    for(const body of this.balls.values()) this.world.removeRigidBody(body);
    this.balls.clear();this.collected=0;this.nextCapture=0;
    points.slice(0,64).forEach((p,id)=>{
      const body=this.world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(p.x,p.y,FUEL_RADIUS+0.005).setCcdEnabled(true).setLinearDamping(0.35).setAngularDamping(0.5));
      this.world.createCollider(R.ColliderDesc.ball(FUEL_RADIUS).setMass(0.215).setFriction(0.65).setRestitution(0.3),body);
      this.balls.set(id,body);
    });
  }

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
      this.world.removeRigidBody(body);this.balls.delete(id);this.collected++;
      this.nextCapture=tick+Math.ceil(1/(Math.min(10,intake.rate)*DT));
      break;
    }
  }

  snapshot():BallPose[] {return Array.from(this.balls,([id,body])=>({id,...body.translation()}));}
}
