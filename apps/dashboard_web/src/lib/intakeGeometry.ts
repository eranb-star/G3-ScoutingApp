export const INTAKE_ROLLER_RADIUS=.065;
// Positive Y rotation pulls the bottom contact surface toward the chassis (-X).
export const INTAKE_ROLLER_SPEED=8;
export function intakePresentation(length:number,reach:number,reference:boolean,height=.65){
 const mountX=reference?.30:length*.35,pivotX=reference?.35:length/2-.04;
 const pivotZ=Math.min(.28,height-.08),rollerX=length/2+reach,rollerZ=Math.min(.20,height-.085);
 const span=Math.hypot(rollerX-pivotX,pivotZ-rollerZ);
 const stowAngle=-Math.asin(Math.max(0,Math.min(1,(height-.085-pivotZ)/span)));
 return {mountX,pivotX,pivotZ,rollerX,rollerZ,span,stowAngle,angle:Math.atan2(pivotZ-rollerZ,rollerX-pivotX)};
}
