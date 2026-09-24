import {FIELD_SEASONS} from './fieldSeasons';
import {OBSTACLES} from './conceptTwin';
import layout from '../../public/twin/2026/tags/layout-welded.json';
import type {SeasonPackage} from './seasonPackage';
/** Existing assets/proxies, explicitly not a reviewed season package or calibrated robot. */
export function planningReference():SeasonPackage{
 const f=FIELD_SEASONS.find(s=>s.year===2026)!;
 return {schema:1,season:2026,revision:'2026-planning-reference-v1',name:'REBUILT · reference geometry',units:'m',frame:'centered-x-forward-z-up',sources:[],
 field:{length:f.length,width:f.width,geometry:'proxy',obstacles:OBSTACLES.map((b,i)=>({id:`proxy-${i+1}`,min:{x:b.x-b.w/2,y:b.y-b.h/2,z:0},max:{x:b.x+b.w/2,y:b.y+b.h/2,z:2}})),tags:layout.tags.map(t=>({id:t.ID,x:layout.field.length/2-t.pose.translation.x,y:layout.field.width/2-t.pose.translation.y,z:t.pose.translation.z,yaw:Math.PI+2*Math.atan2(t.pose.rotation.quaternion.Z,t.pose.rotation.quaternion.W),size:.1651}))},
 autonomous:{seconds:20,reviewed:false},rules:[],supportedInteractions:['intake','shoot','wait']};
}
