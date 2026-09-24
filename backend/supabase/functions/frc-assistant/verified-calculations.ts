import {scoringCombinations,type ScoringRule} from './season-calculations.ts';

/** Only the authenticated server RPC may supply reviewed rule versions. Never use request-body rules. */
export async function verifiedCalculations(caller:any,season:number|null){
 if(season===null)return {status:'not_requested',calculations:[]};
 const {data,error}=await caller.rpc('current_frc_scoring_rules',{p_season:season});
 if(error)return {status:'unavailable',calculations:[]};
 if(!Array.isArray(data)||data.length>50)throw Error('Invalid reviewed rule response');
 const calculations=data.map((v:{versionId:string;rule:ScoringRule;sources:unknown[]})=>{
  const combinations=scoringCombinations(v.rule);
  // Zero autonomous contribution is explicit. No unstated eligibility assumptions.
  const qualifying=combinations.filter(c=>c.qualifies);
  const minimum=qualifying[0]?.points??null;
  const autonomous=v.rule.autonomous;
  if(autonomous&&(!Number.isSafeInteger(autonomous.pointsPerRobot)||autonomous.pointsPerRobot<0||autonomous.pointsPerRobot>100000||!Number.isInteger(autonomous.maxRobots)||autonomous.maxRobots<0||autonomous.maxRobots>ruleRobotLimit(v.rule)))throw Error('Invalid reviewed autonomous scoring');
  const alternatives=autonomous?Array.from({length:autonomous.maxRobots},(_,i)=>{const contribution=(i+1)*autonomous.pointsPerRobot,valid=scoringCombinations(v.rule,contribution).filter(c=>c.qualifies),minimum=valid[0]?.points;return {autonomousRobots:i+1,contribution,combinations:valid.filter(c=>c.points===minimum).slice(0,20)};}):[];
  return {versionId:v.versionId,rule:v.rule,sources:v.sources.map((s:any)=>({documentId:s.documentId,sha256:s.sha256,page:s.page,url:s.url})),autonomousContribution:0,alternatives,
   combinationCount:combinations.length,qualifyingCount:qualifying.length,
   minimumQualifyingPoints:minimum,
   minimumCombinations:qualifying.filter(c=>c.points===minimum).slice(0,20),
   minimumCombinationsTruncated:qualifying.filter(c=>c.points===minimum).length>20};
 });
 let bytes=0;
 const bounded=calculations.filter(c=>{const size=JSON.stringify(c).length;if(bytes+size>18000)return false;bytes+=size;return true;});
 return {status:calculations.length?'available':'no_current_reviewed_rules',calculations:bounded,omittedRules:calculations.length-bounded.length};
}
function ruleRobotLimit(rule:ScoringRule){return Math.min(rule.robots,6);}
