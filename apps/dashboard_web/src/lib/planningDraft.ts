import {parseSeasonPackage,type SeasonPackage} from './seasonPackage';
import {evaluateRoute,type MotionProfile,type RoutePoint} from './autonomousPlanning';
import {cameraCoverage,type CameraMount} from './cameraPlanning';
export type PlanningDraft={schema:1;status:'unverified-planning-draft';season:SeasonPackage;robot:MotionProfile;route:RoutePoint[];cameras:CameraMount[]};
export function parsePlanningDraft(text:string):PlanningDraft{
 if(text.length>500000)throw Error('Planning draft exceeds 500 KB');
 const d=JSON.parse(text) as PlanningDraft;
 if(!d||d.schema!==1||d.status!=='unverified-planning-draft')throw Error('Unsupported planning draft');
 const season=parseSeasonPackage(d.season);evaluateRoute(season,d.robot,d.route);
 if(!Array.isArray(d.cameras)||!d.cameras.length||d.cameras.length>12||new Set(d.cameras.map(c=>c.id)).size!==d.cameras.length)throw Error('Invalid camera candidates');
 d.cameras.forEach(c=>cameraCoverage(season,c,[]));
 return {schema:1,status:'unverified-planning-draft',season,robot:structuredClone(d.robot),route:structuredClone(d.route),cameras:structuredClone(d.cameras)};
}
