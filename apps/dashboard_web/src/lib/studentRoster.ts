import {normalizedTeamMatch} from './accessControl';
export type Student={id:string;display_name:string;subteam:string|null;subteams?:string[];active?:boolean;created_at?:string};
export type RosterEvent={target_type:string;target_value:string|null};
export function expectedStudents(students:Student[],starts:string,event?:RosterEvent){return students.filter(s=>s.active!==false&&(!s.created_at||Date.parse(s.created_at)<=Date.parse(starts))&&(!event||event.target_type==='all'||event.target_type==='member'&&event.target_value===s.id||event.target_type==='subteam'&&[s.subteam,...s.subteams??[]].some(t=>normalizedTeamMatch(t,event.target_value))));}
export function missingStudents(students:Student[],rows:{member_id:string}[]){const present=new Set(rows.map(r=>r.member_id));return students.filter(s=>!present.has(s.id));}
