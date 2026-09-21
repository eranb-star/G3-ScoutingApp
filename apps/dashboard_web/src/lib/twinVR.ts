import * as THREE from 'three';
import {DRIVER_STATIONS_2026} from './twinDriverView';
export type VRInput={vx:number;vy:number;omega:number;shoot:boolean;intake:boolean;drive:boolean};
export function vrInput(sources:Iterable<XRInputSource>,ready:boolean):VRInput{
 const all=[...sources],left=all.find(s=>s.handedness==='left'),right=all.find(s=>s.handedness==='right');
 const a=left?.gamepad,b=right?.gamepad;
 const valid=ready;
 const drive=!!(valid&&a&&b&&a.mapping==='xr-standard'&&b.mapping==='xr-standard'&&a.axes.length>=4&&b.axes.length>=4&&b.buttons[1]?.pressed);
 const axis=(v:number)=>Number.isFinite(v)&&Math.abs(v)>.15?Math.sign(v)*(Math.min(1,Math.abs(v))-.15)/.85:0;
 if(!drive)return {vx:0,vy:0,omega:0,shoot:false,intake:false,drive:false};
 return {vx:-axis(a!.axes[3]),vy:-axis(a!.axes[2]),omega:-axis(b!.axes[2]),shoot:!!b!.buttons[0]?.pressed,intake:!!a!.buttons[0]?.pressed,drive:true};
}
export function createTwinVR(renderer:THREE.WebGLRenderer,camera:THREE.PerspectiveCamera,scene:THREE.Scene,changed:(active:boolean)=>void){
 renderer.xr.enabled=true;renderer.xr.setReferenceSpaceType('local-floor');
 const rig=new THREE.Group();scene.add(rig);rig.add(camera);
 const label=document.createElement('canvas');label.width=1024;label.height=192;const ctx=label.getContext('2d')!;
 const texture=new THREE.CanvasTexture(label),material=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthTest:false,depthWrite:false});
 const hud=new THREE.Mesh(new THREE.PlaneGeometry(.8,.15),material);hud.position.set(0,-.3,-1);hud.renderOrder=100;camera.add(hud);hud.visible=false;
 let pending=false,disposed=false,session:XRSession|null=null,center=true,armed=false,previousCenter=false,previousExit=false,frames=0,start=0,last=0,worst=0,total=0,slow=0,visible=true,eye=0;
 const zero:VRInput={vx:0,vy:0,omega:0,shoot:false,intake:false,drive:false};
 function paint(message:string){ctx.clearRect(0,0,1024,192);ctx.fillStyle='rgba(12,22,35,.88)';ctx.fillRect(0,0,1024,192);ctx.fillStyle='#ffffff';ctx.font='26px sans-serif';message.split('\n').forEach((line,i)=>ctx.fillText(line,20,35+i*38));texture.needsUpdate=true;}
 const visibility=()=>{visible=session?.visibilityState==='visible';armed=false;last=0;changed(!!session);};
 const ended=()=>{session?.removeEventListener('visibilitychange',visibility);session=null;armed=false;hud.visible=false;rig.position.set(0,0,0);rig.rotation.set(0,0,0);camera.up.set(0,0,1);camera.position.set(-12,-15,15);if(!disposed)changed(false);};
 return {
 get active(){return !!session;},
 async enter(high:boolean){if(disposed)throw Error('Renderer closed. Reopen 3D.');if(!navigator.xr)throw Error('Open this page in Meta Quest Browser.');if(session||pending)return;pending=true;
 try{
 renderer.xr.setFramebufferScaleFactor(high?1:.8);renderer.xr.setFoveation(high?0:1);
 const next=await navigator.xr.requestSession('immersive-vr',{requiredFeatures:['local-floor']});
 if(disposed){await next.end();return;}session=next;visible=true;center=true;armed=false;previousCenter=previousExit=false;frames=0;start=last=total=worst=slow=0;next.addEventListener('end',ended,{once:true});next.addEventListener('visibilitychange',visibility);
 camera.position.set(0,0,0);camera.quaternion.identity();camera.up.set(0,1,0);hud.visible=true;paint('VR prototype · Red station 1\nRelease right grip, then hold it to drive.');
 try{await renderer.xr.setSession(next);changed(true);}catch(e){await next.end();throw e;}
 }finally{pending=false;}
 },
 update(now:number,frame:XRFrame):VRInput{
 if(!session)return zero;const ref=renderer.xr.getReferenceSpace();const pose=ref?frame.getViewerPose(ref):null;
 const right=[...session.inputSources].find(s=>s.handedness==='right')?.gamepad,left=[...session.inputSources].find(s=>s.handedness==='left')?.gamepad;
 const tracked=[...session.inputSources].filter(s=>s.handedness==='left'||s.handedness==='right').filter(s=>s.gripSpace&&ref&&frame.getPose(s.gripSpace,ref));
 if(tracked.length<2)armed=false;
 if(!pose||pose.emulatedPosition||!visible){armed=false;last=0;paint('PAUSED · tracking or headset focus unavailable');return zero;}
 const recenter=!!left?.buttons[4]?.pressed,exit=!!right?.buttons[5]?.pressed;
 if(exit&&!previousExit){void session.end();return zero;}previousExit=exit;
 if(recenter&&!previousCenter)center=true;previousCenter=recenter;
 if(center){const t=pose.transform,forward=new THREE.Vector3(0,0,-1).applyQuaternion(new THREE.Quaternion(t.orientation.x,t.orientation.y,t.orientation.z,t.orientation.w));const yaw=Math.atan2(-forward.x,-forward.z);
 rig.rotation.set(Math.PI/2,0,-Math.PI/2-yaw,'ZXY');rig.position.set(0,0,0);rig.updateMatrixWorld(true);
 const offset=new THREE.Vector3(t.position.x,0,t.position.z).applyQuaternion(rig.quaternion);const [x,y]=DRIVER_STATIONS_2026.red[0];rig.position.set(x-.6-offset.x,y-offset.y,0);center=false;armed=false;
 }
 eye=pose.transform.position.y;if(last){const dt=now-last;worst=Math.max(worst,dt);if(dt>250)armed=false;if(dt>20)slow++;}last=now;if(!start)start=now;frames++;total++;
 if(tracked.length===2&&right&&left&&!right.buttons[1]?.pressed&&!right.buttons[0]?.pressed&&!left.buttons[0]?.pressed&&[...left.axes,...right.axes].every(a=>Number.isFinite(a)&&Math.abs(a)<.15))armed=true;
 const input=vrInput(session.inputSources,armed);
 if(now-start>=1000){paint(`Red station 1 · ${Math.round(frames*1000/(now-start))} FPS · eye ${eye.toFixed(2)} m\nHold right grip: drive · left stick: move · right stick: turn\nTriggers: left intake / right shoot · X: recenter · B: exit\nWorst gap ${worst.toFixed(0)} ms · >20ms gaps ${slow}/${total} · ${input.drive?'DRIVING':'PAUSED'}`);start=now;frames=0;}
 return input;
 },
 dispose(){disposed=true;if(session)void session.end();hud.geometry.dispose();material.dispose();texture.dispose();scene.remove(rig);},
 };
}
