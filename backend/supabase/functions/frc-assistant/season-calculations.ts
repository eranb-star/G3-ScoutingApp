/** Pure, season-independent arithmetic. Publication/authority is a caller concern. */
export type ScoringRule = {id:string;revision:string;threshold:number;robots:number;levels:{id:string;points:number}[]};
export function scoringCombinations(rule:ScoringRule,autonomousPoints=0){
 if(!rule||!rule.id||!rule.revision||!Number.isSafeInteger(rule.threshold)||rule.threshold<1||rule.threshold>100000||!Number.isInteger(rule.robots)||rule.robots<1||rule.robots>6||!Array.isArray(rule.levels)||rule.levels.length<1||rule.levels.length>8||!Number.isSafeInteger(autonomousPoints)||autonomousPoints<0||autonomousPoints>100000)throw Error('Invalid scoring rule');
 const levels=rule.levels;
 if(new Set(levels.map(l=>l.id)).size!==levels.length||levels.some(l=>!l.id||!Number.isSafeInteger(l.points)||l.points<0||l.points>100000))throw Error('Invalid scoring levels');
 const combinations:{levels:string[];points:number;qualifies:boolean}[]=[];
 // Non-decreasing indices enumerate multisets, not duplicate robot permutations.
 function visit(start:number,selected:string[],points:number){
  if(selected.length===rule.robots){combinations.push({levels:selected,points:points+autonomousPoints,qualifies:points+autonomousPoints>=rule.threshold});return;}
  for(let i=start;i<levels.length;i++)visit(i,[...selected,levels[i].id],points+levels[i].points);
 }
 visit(0,[],0);
 return combinations.sort((a,b)=>a.points-b.points||a.levels.join(',').localeCompare(b.levels.join(',')));
}
