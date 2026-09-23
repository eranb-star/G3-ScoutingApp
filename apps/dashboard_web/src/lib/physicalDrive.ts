import {intakeForRobot,shooterForRobot} from './robotPracticeDefaults';
import {opponentCommand} from './twinOpponent';
import {DEFAULT_SHOOTER,ShooterConfig,HUB_APOTHEM} from './shooter';
import {IntakeMechanism} from './intakeMechanism';
import {FuelPhysics} from './fuelPhysics';
import {DEFAULT_INTAKE,IntakeConfig} from './intake';
import R from '@dimforge/rapier3d-compat';
import {Command,Concept,DEFAULT_CONCEPT,DT,FIELD,Pose,START} from './conceptTwin';
export const PHYSICAL_ENGINE='g3-physical-v4';
export type PhysicalPose=Pose&{z:number;rotation:{x:number;y:number;z:number;w:number};contacts:number;speed:number};
let initialized:Promise<void>|undefined;
export async function createPhysicalDrive(config:Concept){await(initialized??=R.init());return new PhysicalDrive(config);}
export class PhysicalDrive{
 world=new R.World({x:0,y:0,z:-9.81});body:R.RigidBody;tick=0;distance=0;collisions=0;contacts=0;
 fuel=new FuelPhysics(this.world);mechanism:IntakeMechanism;
 opponent?:{body:R.RigidBody;mechanism:IntakeMechanism;state:string;intake:boolean;config:Concept};
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
 // Robot envelope remains solid; balls encounter an open hexagonal receiver.
 this.world.createCollider(R.ColliderDesc.cuboid(.597,.597,1.2).setTranslation(x,0,1.2).setCollisionGroups((4<<16)|1));
 box(x,0,.68,1.194,1.194,1.36);
 for(let i=0;i<6;i++){const a=i*Math.PI/3;this.world.createCollider(R.ColliderDesc.cuboid(.035,.33,.235).setTranslation(x+(HUB_APOTHEM+.035)*Math.cos(a),(HUB_APOTHEM+.035)*Math.sin(a),1.595).setRotation({x:0,y:0,z:Math.sin(a/2),w:Math.cos(a/2)}).setRestitution(.3));}
 // Back net faces neutral and can deflect shots from the prohibited side.
 box(x-Math.sign(x)*.65,0,2.2,.035,1.25,.8);
 for(const side of [-1,1]){
 const y=side*1.524,half=.564,depth=.927,height=.1654;
 const vertices=new Float32Array([-half,-depth,0,half,-depth,0,0,-depth,height,-half,depth,0,half,depth,0,0,depth,height]);
 this.world.createCollider(R.ColliderDesc.convexHull(vertices)!.setTranslation(x,y,0).setFriction(.8));
 const ty=side*3.24;box(x,ty,.6652,1.194,1.668,.2);for(const edge of [-1,1])box(x,ty+edge*.73675,.2826,1.194,.1945,.5652);
 }}
 this.body=this.world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(START.x,START.y,.31).setCcdEnabled(true).setAngularDamping(2));
 this.world.createCollider(R.ColliderDesc.cuboid(config.length/2,config.width/2,(config.height-.08)/2).setTranslation(0,0,(config.height+.08)/2-.3).setMass(50).setCollisionGroups((1<<16)|7).setFriction(.35).setRestitution(0),this.body);
 this.mechanism=new IntakeMechanism(this.world,this.body,config);
 this.world.step();
 }
 step(command:Command,intake:IntakeConfig=DEFAULT_INTAKE,shooter:ShooterConfig=DEFAULT_SHOOTER):PhysicalPose{
 this.fuel.clearForces();
 this.fuel.shoot(this.body,this.config.length,this.tick,shooter);
 const deployed=this.mechanism.update(intake,this.fuel.collected<intake.capacity);
 if(deployed)this.fuel.capture(this.body,this.config.length,this.tick,intake);
 const before=this.body.translation();this.contacts=this.driveBody(this.body,command,this.config);
 if(this.opponent){const o=this.opponent;this.fuel.prepareOpponent();const p=o.body.translation(),r=o.body.rotation(),v=o.body.linvel();const state={x:p.x,y:p.y,heading:Math.atan2(2*(r.w*r.z+r.x*r.y),1-2*(r.y*r.y+r.z*r.z)),speed:Math.hypot(v.x,v.y)};
  this.fuel.withActor('computer',()=>{const ai=opponentCommand(state,this.fuel.snapshot(),this.fuel.collected,o.config.length,this.tick,o.config.robotId==='darwin');o.state=ai.state;o.intake=ai.intake;const intake={...intakeForRobot(o.config.robotId??'kitbot'),on:ai.intake};if(o.mechanism.update(intake,this.fuel.collected<intake.capacity))this.fuel.capture(o.body,o.config.length,this.tick,intake);this.fuel.shoot(o.body,o.config.length,this.tick,{...ai.shooter,lanes:shooterForRobot(o.config.robotId??'kitbot').lanes});this.driveBody(o.body,ai.command,o.config);});
 }
 this.world.step();this.tick++;this.fuel.afterStep(this.tick);const p=this.body.translation(),v=this.body.linvel();this.distance+=Math.hypot(p.x-before.x,p.y-before.y);if(Math.hypot(command.vx,command.vy)>.2&&Math.hypot(v.x,v.y)<.05)this.collisions++;
 return this.snapshot();
 }
 private driveBody(body:R.RigidBody,command:Command,config:Concept){
 const before=body.translation(),q=body.rotation();body.resetForces(true);body.resetTorques(true);let contacts=0;
 const rotate=(x:number,y:number,z:number)=>{const tx=2*(q.y*z-q.z*y),ty=2*(q.z*x-q.x*z),tz=2*(q.x*y-q.y*x);return {x:x+q.w*tx+q.y*tz-q.z*ty,y:y+q.w*ty+q.z*tx-q.x*tz,z:z+q.w*tz+q.x*ty-q.y*tx};};
 for(const x of [-config.length*.38,config.length*.38])for(const y of [-config.width*.38,config.width*.38]){
 const offset=rotate(x,y,-.08),origin={x:before.x+offset.x,y:before.y+offset.y,z:before.z+offset.z};
 const hit=this.world.castRayAndGetNormal(new R.Ray(origin,{x:0,y:0,z:-1}),.32,true,undefined,undefined,undefined,body);
 if(hit&&hit.normal.z>.3){contacts++;const v=body.velocityAtPoint(origin),support=Math.max(0,Math.min(1500,(.24-hit.timeOfImpact)*10000-v.z*700));body.addForceAtPoint({x:0,y:0,z:support},origin,true);
 const norm=Math.max(1,Math.hypot(command.vx,command.vy)),targetX=command.vx/norm*config.speed-command.omega*config.turn*offset.y,targetY=command.vy/norm*config.speed+command.omega*config.turn*offset.x;
 let fx=(targetX-v.x)*100,fy=(targetY-v.y)*100;const limit=Math.min(50*3/4,support*1.1),m=Math.max(1,Math.hypot(fx,fy)/Math.max(limit,.001));fx/=m;fy/=m;body.addForceAtPoint({x:fx,y:fy,z:0},origin,true);
 }}
 return contacts;
 }
 setOpponent(enabled:boolean,config:Concept=DEFAULT_CONCEPT){
  if(this.opponent){this.fuel.releaseOpponent(this.opponent.body.translation());this.world.removeRigidBody(this.opponent.body);this.opponent=undefined;}
  if(!enabled)return;
  const body=this.world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(6,-2.7,.31).setCcdEnabled(true).setAngularDamping(2));
  this.world.createCollider(R.ColliderDesc.cuboid(config.length/2,config.width/2,(config.height-.08)/2).setTranslation(0,0,(config.height+.08)/2-.3).setMass(50).setCollisionGroups((1<<16)|7).setFriction(.35),body);
  this.opponent={body,mechanism:new IntakeMechanism(this.world,body,config),state:'Ready',intake:false,config};this.fuel.prepareOpponent();
 }
 snapshot():PhysicalPose{const p=this.body.translation(),r=this.body.rotation(),v=this.body.linvel();
 const opponent=this.opponent?(()=>{const o=this.opponent!,p=o.body.translation(),r=o.body.rotation();return {x:p.x,y:p.y,z:p.z-.3,rotation:{...r},heading:Math.atan2(2*(r.w*r.z+r.x*r.y),1-2*(r.y*r.y+r.z*r.z)),state:o.state,intake:o.intake,stored:this.fuel.withActor('computer',()=>this.fuel.collected),scored:this.fuel.credits.get('computer')??0};})():undefined;
 return {opponent,playerScored:this.fuel.credits.get('player')??0,storedIds:[...this.fuel.stored],fuelVisualEpoch:this.fuel.visualEpoch,fuelVisualEvents:[...this.fuel.visualEvents],velocity:{...v},angularVelocity:{...this.body.angvel()},ledger:this.fuel.ledger(),scores:[...this.fuel.scores],shots:this.fuel.shots,balls:this.fuel.snapshot(),collected:this.fuel.collected,x:p.x,y:p.y,z:p.z-.3,rotation:{...r},heading:Math.atan2(2*(r.w*r.z+r.x*r.y),1-2*(r.y*r.y+r.z*r.z)),tick:this.tick,distance:this.distance,collisions:this.collisions,contacts:this.contacts,speed:Math.hypot(v.x,v.y)};
 }
 reset(x=START.x,y=START.y){if(this.opponent){const config=this.opponent.config;this.setOpponent(false);this.setOpponent(true,config);}this.body.setTranslation({x,y,z:.31},true);this.body.setRotation({x:0,y:0,z:0,w:1},true);this.body.setLinvel({x:0,y:0,z:0},true);this.body.setAngvel({x:0,y:0,z:0},true);this.body.resetForces(true);this.body.resetTorques(true);this.contacts=0;this.tick=0;this.distance=0;this.collisions=0;}
 dispose(){this.world.free();}
}
