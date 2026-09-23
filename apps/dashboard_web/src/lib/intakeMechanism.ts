import R from '@dimforge/rapier3d-compat';
import {intakePresentation,INTAKE_ROLLER_RADIUS} from './intakeGeometry';
import type {IntakeConfig} from './intake';
import type {Concept} from './conceptTwin';
/** Rigid arms and a compliant powered roller. Dimensions are a reference attachment, not CAD inference. */
export class IntakeMechanism {
 private arms:R.Collider[];private roller:R.Collider;angle:number;
 constructor(world:R.World,body:R.RigidBody,private config:Concept){
  const desc=()=>R.ColliderDesc.cuboid(.02,.02,.02).setMass(0).setCollisionGroups((1<<16)|7).setFriction(.6);
  this.arms=[world.createCollider(desc(),body),world.createCollider(desc(),body)];
  this.roller=world.createCollider(R.ColliderDesc.cylinder(.325,INTAKE_ROLLER_RADIUS).setMass(0).setCollisionGroups((1<<16)|7).setFriction(.8),body);
  this.angle=intakePresentation(config.length,.3,true,config.height).stowAngle;
 }
 update(intake:IntakeConfig,canFeed=true){
  const g=intakePresentation(this.config.length,intake.reach,true,this.config.height);
  this.angle+=( (intake.on?g.angle:g.stowAngle)-this.angle)*(1-Math.exp(-9/60));
  const x=g.pivotX+Math.cos(this.angle)*g.span,z=g.pivotZ-Math.sin(this.angle)*g.span;
  this.arms.forEach((arm,i)=>{arm.setShape(new R.Cuboid(g.span/2,.018,.018));arm.setTranslationWrtParent({x:(g.pivotX+x)/2,y:(i?1:-1)*intake.width/2,z:(g.pivotZ+z)/2-.3});arm.setRotationWrtParent({x:0,y:Math.sin(this.angle/2),z:0,w:Math.cos(this.angle/2)});});
  this.roller.setShape(new R.Cylinder(intake.width/2,INTAKE_ROLLER_RADIUS));this.roller.setTranslationWrtParent({x,y:0,z:z-.3});
  // Powered rubber compliance is handled by fuel traction, not an impenetrable cylinder.
  this.roller.setSensor(intake.on&&canFeed);
  return Math.abs(this.angle-g.angle)<.08;
 }
}
