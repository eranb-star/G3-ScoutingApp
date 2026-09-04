import { useEffect, useMemo, useState } from "react";
import { useMemberAuth, type TeamRole } from "./memberAuth";
import { supabase } from "../supabase";
import { frcTeams, teamMatches } from "./frcTeams";

export type PermissionKey="view_team_data"|"manage_team_projects"|"assign_team_work"|"manage_robot_reliability"|"manage_training"|"validate_training"|"manage_team_calendar"|"create_announcements"|"manage_inventory"|"operate_competition"|"view_team_reports"|"correct_attendance"|"manage_members"|"manage_permissions"|"view_security_audit";

const defaults:Record<TeamRole,PermissionKey[]>={
  member:["view_team_data","operate_competition"],
  team_leader:["view_team_data","manage_team_projects","assign_team_work","manage_robot_reliability","manage_training","manage_team_calendar","create_announcements","manage_inventory","operate_competition","view_team_reports"],
  mentor:["view_team_data","manage_team_projects","assign_team_work","manage_robot_reliability","manage_training","validate_training","manage_team_calendar","create_announcements","manage_inventory","operate_competition","view_team_reports"],
  admin:["view_team_data","manage_team_projects","assign_team_work","manage_robot_reliability","manage_training","validate_training","manage_team_calendar","create_announcements","manage_inventory","operate_competition","view_team_reports","correct_attendance","manage_members","manage_permissions","view_security_audit"],
};
const teamScoped=new Set<PermissionKey>(["manage_team_projects","assign_team_work","manage_robot_reliability","manage_training","manage_team_calendar","create_announcements","manage_inventory","view_team_reports"]);

export function memberTeams(profile:{subteam:string|null;subteams?:string[]} | null | undefined){return Array.from(new Set([...(profile?.subteams??[]),profile?.subteam??""].map(item=>item.trim()).filter(Boolean)));}
export function normalizedTeamMatch(left:string|null|undefined,right:string|null|undefined){
  if(!left||!right)return false;
  const leftTeam=frcTeams.find(team=>teamMatches(left,team));
  const rightTeam=frcTeams.find(team=>teamMatches(right,team));
  if(leftTeam&&rightTeam)return leftTeam.key===rightTeam.key;
  return left.trim().toLowerCase()===right.trim().toLowerCase();
}

export function useAccessControl(){
  const {profile}=useMemberAuth();
  const [permissions,setPermissions]=useState<PermissionKey[]>(profile?defaults[profile.role]:[]);
  useEffect(()=>{let active=true;if(!profile){setPermissions([]);return;}setPermissions(defaults[profile.role]);supabase.from("role_permissions").select("permission_key").eq("role",profile.role).eq("allowed",true).then(({data,error})=>{if(active&&!error)setPermissions((data??[]).map(row=>row.permission_key as PermissionKey));});return()=>{active=false;};},[profile?.id,profile?.role]);
  return useMemo(()=>({permissions,can:(key:PermissionKey,team?:string|null)=>{if(!profile||!permissions.includes(key))return false;if(profile.role==="admin"||profile.role==="mentor")return true;if(profile.role!=="team_leader")return !teamScoped.has(key);if(!teamScoped.has(key))return true;if(!team)return false;return (profile.leader_subteams??[]).some(item=>normalizedTeamMatch(item,team));}}),[permissions,profile]);
}
