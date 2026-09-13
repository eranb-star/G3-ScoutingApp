import {FuelPhysics} from './fuelPhysics';
import {DEFAULT_INTAKE,IntakeConfig} from './intake';
import R from '@dimforge/rapier3d-compat';
import {Command,Concept,DT,FIELD,Pose,START} from './conceptTwin';
export const PHYSICAL_ENGINE='g3-physical-v2';
export type PhysicalPose=Pose&{z:number;rotation:{x:number;y:number;z:number;w:number};contacts:number;speed:number};
let initialized:Promise<void>|undefined;
export async function createPhysicalDrive(config:Concept){await(initialized??=R.init());return new PhysicalDrive(config);}
export class PhysicalDrive{
 world=new R.World({x:0,y:0,z:-9.81});body:R.RigidBody;tick=0;distance=0;collisions=0;contacts=0;
 fuel=new FuelPhysics(this.world);
 constructor(public config:Concept){
 this.world.timestep=DT;
 const box=(x:number,y:number,z:number,w:number,d:number,h:number)=>this.world.createCollider(R.ColliderDesc.cuboid(w/2,d/2,h/2).setTranslation(x,y,z).setFriction(.8));
 box(0,0,-.1,FIELD.length,FIELD.width,.2);for(const sign of [-1,1]){box(sign*FIELD.length/2,0,.6,.1,FIELD.width,1.2);box(0,sign*FIELD.width/2,.6,FIELD.length,.1,1.2);}
 // Tower envelope and depot rails aligned to the distributed 2026 CAD.
 // Tower is deliberately a solid driving envelope; climbing is not simulated.
 for(const side of [-1,1]){
 box(side*7.7,side*.288925,.915,1.148,.9906,1.83);
 const depotY=-side*1.9304;
 box(side*7.622825,depotY,.0142875,.0762,1.0668,.028575);
 for(const edge of [-1,1])box(side*7.965725,depotY+edge*.4953,.0142875,.6096,.0762,.028575);
 }
 for(const x of [-3.644,3.644]){
 box(x,0,1.2,1.194,1.194,2.4);
 for(const side of [-1,1]){
 const y=side*1.524,half=.564,depth=.927,height=.1654;
 const vertices=new Float32Array([-half,-depth,0,half,-depth,0,0,-depth,height,-half,depth,0,half,depth,0,0,depth,height]);
 this.world.createCollider(R.ColliderDesc.convexHull(vertices)!.setTranslation(x,y,0).setFriction(.8));
 const ty=side*3.24;box(x,ty,.6652,1.194,1.668,.2);for(const edge of [-1,1])box(x,ty+edge*.73675,.2826,1.194,.1945,.5652);
 }}
 this.body=this.world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(START.x,START.y,.31).setCcdEnabled(true).setAngularDamping(2));
 this.world.createCollider(R.ColliderDesc.cuboid(config.length/2,config.width/2,(config.height-.08)/2).setTranslation(0,0,(config.height+.08)/2-.3).setMass(50).setFriction(.35).setRestitution(0),this.body);
 this.world.step();
 }
 step(command:Command,intake:IntakeConfig=DEFAULT_INTAKE):PhysicalPose{
 this.fuel.capture(this.body,this.config.length,this.tick,intake);
 const before=this.body.translation(),q=this.body.rotation();this.body.resetForces(true);this.body.resetTorques(true);this.contacts=0;
 const rotate=(x:number,y:number,z:number)=>{const tx=2*(q.y*z-q.z*y),ty=2*(q.z*x-q.x*z),tz=2*(q.x*y-q.y*x);return {x:x+q.w*tx+q.y*tz-q.z*ty,y:y+q.w*ty+q.z*tx-q.x*tz,z:z+q.w*tz+q.x*ty-q.y*tx};};
 for(const x of [-this.config.length*.38,this.config.length*.38])for(const y of [-this.config.width*.38,this.config.width*.38]){
 const offset=rotate(x,y,-.08),origin={x:before.x+offset.x,y:before.y+offset.y,z:before.z+offset.z};
 const hit=this.world.castRayAndGetNormal(new R.Ray(origin,{x:0,y:0,z:-1}),.32,true,undefined,undefined,undefined,this.body);
 if(hit&&hit.normal.z>.3){this.contacts++;const v=this.body.velocityAtPoint(origin),support=Math.max(0,Math.min(1500,(.24-hit.timeOfImpact)*10000-v.z*700));this.body.addForceAtPoint({x:0,y:0,z:support},origin,true);
 const norm=Math.max(1,Math.hypot(command.vx,command.vy)),targetX=command.vx/norm*this.config.speed-command.omega*this.config.turn*offset.y,targetY=command.vy/norm*this.config.speed+command.omega*this.config.turn*offset.x;
 let fx=(targetX-v.x)*100,fy=(targetY-v.y)*100;const limit=Math.min(50*3/4,support*1.1),m=Math.max(1,Math.hypot(fx,fy)/Math.max(limit,.001));fx/=m;fy/=m;this.body.addForceAtPoint({x:fx,y:fy,z:0},origin,true);
 }}
 this.world.step();this.tick++;const p=this.body.translation(),r=this.body.rotation(),v=this.body.linvel();this.distance+=Math.hypot(p.x-before.x,p.y-before.y);if(Math.hypot(command.vx,command.vy)>.2&&Math.hypot(v.x,v.y)<.05)this.collisions++;
 return {balls:this.fuel.snapshot(),collected:this.fuel.collected,x:p.x,y:p.y,z:p.z-.3,rotation:{...r},heading:Math.atan2(2*(r.w*r.z+r.x*r.y),1-2*(r.y*r.y+r.z*r.z)),tick:this.tick,distance:this.distance,collisions:this.collisions,contacts:this.contacts,speed:Math.hypot(v.x,v.y)};
 }
 reset(x=START.x,y=START.y){this.body.setTranslation({x,y,z:.31},true);this.body.setRotation({x:0,y:0,z:0,w:1},true);this.body.setLinvel({x:0,y:0,z:0},true);this.body.setAngvel({x:0,y:0,z:0},true);this.tick=0;this.distance=0;this.collisions=0;}
 dispose(){this.world.free();}
}
