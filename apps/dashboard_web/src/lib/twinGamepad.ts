import type {Command} from './conceptTwin';

export type Pad = Pick<Gamepad,'id'|'index'|'mapping'|'connected'|'axes'|'buttons'>;
export type AxisBinding={axis:number;invert:boolean;center:number};
export type PadProfile={version:1;frame:'robot'|'field';forward:AxisBinding;strafe:AxisBinding;turn:AxisBinding;deadband:number;curve:number;driveScale:number;turnScale:number;intakeButton:number;shootButton:number;stopButton:number;verified:boolean};
export const DEFAULT_PAD:PadProfile={version:1,frame:'robot',forward:{axis:1,invert:true,center:0},strafe:{axis:0,invert:false,center:0},turn:{axis:2,invert:false,center:0},deadband:.12,curve:1.5,driveScale:1,turnScale:.7,intakeButton:0,shootButton:7,stopButton:1,verified:false};
export const padKey=(pad:Pad)=>`${pad.id}|${pad.mapping}|${pad.axes.length}|${pad.buttons.length}`;
export const freshProfile=():PadProfile=>JSON.parse(JSON.stringify(DEFAULT_PAD));
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
export function validProfile(value:unknown):value is PadProfile{
 const p=value as PadProfile;if(!p||p.version!==1||!['robot','field'].includes(p.frame)||typeof p.verified!=='boolean')return false;
 if(!['forward','strafe','turn'].every(k=>{const a=p[k as 'forward'];return a&&Number.isInteger(a.axis)&&a.axis>=(k==='strafe'?-1:0)&&a.axis<=63&&typeof a.invert==='boolean'&&Number.isFinite(a.center)&&Math.abs(a.center)<=.25;}))return false;
 return [[p.deadband,.05,.35],[p.curve,1,3],[p.driveScale,.2,1],[p.turnScale,.2,1]].every(([n,min,max])=>Number.isFinite(n)&&n>=min&&n<=max)&&[p.intakeButton,p.shootButton,p.stopButton].every(n=>Number.isInteger(n)&&n>=-1&&n<=63);
}
export function loadPadProfile(key:string):PadProfile{try{const p=JSON.parse(localStorage.getItem(`g3-gamepad-v1:${key}`)??'null');return validProfile(p)?p:freshProfile();}catch{return freshProfile();}}
export function savePadProfile(key:string,p:PadProfile){if(!validProfile(p))throw Error('Invalid controller profile');localStorage.setItem(`g3-gamepad-v1:${key}`,JSON.stringify(p));}
export function axisValue(pad:Pad,b:AxisBinding,deadband:number,curve=1){
 const raw=pad.axes[b.axis];if(!Number.isFinite(raw))return 0;
 const offset=raw-b.center,range=offset>=0?1-b.center:1+b.center;
 const v=clamp(offset/range,-1,1)*(b.invert?-1:1),m=Math.abs(v);
 return m<=deadband?0:Math.sign(v)*Math.pow((m-deadband)/(1-deadband),curve);
}
export const padButton=(pad:Pad,index:number)=>index>=0&&Number.isFinite(pad.buttons[index]?.value)&&(pad.buttons[index].pressed||pad.buttons[index].value>.5);
export function padProblem(pad:Pad|null,p:PadProfile):string{
 if(!pad?.connected)return 'Controller unavailable. Connect it and press a controller button.';
 if(!validProfile(p))return 'Restore the controller defaults and configure the mapping again.';
 const axes=[p.forward.axis,p.strafe.axis,p.turn.axis].filter(i=>i>=0);
 if(axes.some(i=>i>=pad.axes.length||!Number.isFinite(pad.axes[i])))return 'A mapped axis is unavailable. Check the axis assignments.';
 if(new Set(axes).size!==axes.length)return 'Forward, strafe and rotation must use different axes.';
 const buttons=[p.intakeButton,p.shootButton,p.stopButton].filter(i=>i>=0);
 if(buttons.some(i=>i>=pad.buttons.length||!Number.isFinite(pad.buttons[i].value)))return 'A mapped button is unavailable. Choose a valid button or Not assigned.';
 if(new Set(buttons).size!==buttons.length)return 'Each controller action must use a different button.';
 if(pad.mapping!=='standard'&&!p.verified)return 'Non-standard controller: check the live directions, then confirm the mapping below.';
 return '';
}
export function padNeutral(pad:Pad,p:PadProfile){return [p.forward,p.strafe,p.turn].every(b=>axisValue(pad,b,p.deadband)===0)&&![p.intakeButton,p.shootButton,p.stopButton].some(i=>padButton(pad,i));}
// The physics engine consumes FIELD vx/vy and positive counter-clockwise omega.
// Driver intent is forward/right/clockwise. Robot front is local +X, left +Y.
export function padCommand(pad:Pad,p:PadProfile,heading:number):Command{
 const forward=axisValue(pad,p.forward,p.deadband,p.curve),right=axisValue(pad,p.strafe,p.deadband,p.curve),clockwise=axisValue(pad,p.turn,p.deadband,p.curve);
 const norm=Math.max(1,Math.hypot(forward,right)),f=forward/norm*p.driveScale,r=right/norm*p.driveScale,h=p.frame==='robot'?heading:0;
 return {vx:f*Math.cos(h)+r*Math.sin(h),vy:f*Math.sin(h)-r*Math.cos(h),omega:-clockwise*p.turnScale};
}
export function centeredProfile(pad:Pad,p:PadProfile):PadProfile{
 const next=structuredClone(p);for(const name of ['forward','strafe','turn'] as const){if(p[name].axis===-1){next[name].center=0;continue;}const v=pad.axes[p[name].axis];if(!Number.isFinite(v)||Math.abs(v)>.25)throw Error('Release all sticks first. Center offsets must be within 25%.');next[name].center=v;}return next;
}
export function getPads():Gamepad[]{try{return Array.from(navigator.getGamepads?.()??[]).filter((p):p is Gamepad=>!!p&&p.connected);}catch{return [];}}
