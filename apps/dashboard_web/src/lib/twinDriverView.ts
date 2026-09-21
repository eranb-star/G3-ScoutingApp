export type TwinView='orbit'|'top'|'follow'|'robot'|'driver1'|'driver2'|'driver3';
export type DriverSettings={alliance:'red'|'blue';eyeHeight:number;look:number;pitch:number};
export const isDriverView=(view:TwinView)=>view.startsWith('driver');
// Bundled 2026 field-config.json driverStations, in the renderer's centered frame.
// FIRST manual 5.9 / figure 5-14 confirms numbering; tower separates 2 and 3.
export const DRIVER_STATIONS_2026={red:[[-8.2775425,3.07975],[-8.2775425,1.25095],[-8.2775425,-1.8288]],blue:[[8.2775425,-3.07975],[8.2775425,-1.25095],[8.2775425,1.8288]]} as const;
export function driverCamera(view:TwinView,settings:DriverSettings,aspect:number){
 const station=Math.max(0,Math.min(2,Number(view.slice(-1))-1));
 const [wallX,y]=DRIVER_STATIONS_2026[settings.alliance][station];
 const x=wallX+Math.sign(wallX)*.6,z=Math.max(1.1,Math.min(2,settings.eyeHeight));
 const heading=Math.atan2(-y,-x)+Math.max(-70,Math.min(70,settings.look))*Math.PI/180;
 // 90-degree horizontal field of view; cap vertical FOV on narrow displays.
 const fov=Math.min(85,2*Math.atan(1/Math.max(.1,aspect))*180/Math.PI);
 return {x,y,z,targetX:x+10*Math.cos(heading),targetY:y+10*Math.sin(heading),targetZ:z+10*Math.tan(Math.max(-50,Math.min(25,settings.pitch))*Math.PI/180),fov};
}
