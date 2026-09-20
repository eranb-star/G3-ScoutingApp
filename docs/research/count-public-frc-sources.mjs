// Read-only census: ten official team-directory requests, sequential, no imports.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const output=new URL('./frc-team-directory-census-20260920.json',import.meta.url);
const report={checkedAt:new Date().toISOString(),definition:'Unique team-number links in each official FIRST allteams directory. Team-season directory entries, not independently verified robot configurations or documents.',years:[]};
for(let year=2017;year<=2026;year++){
 const url=`https://frc-events.firstinspires.org/${year}/allteams`;
 try{const response=await fetch(url,{signal:AbortSignal.timeout(60000),headers:{'User-Agent':'G3-6740-Knowledge-Capacity-Research/1.0'}});const html=await response.text();
 const teams=[...new Set([...html.matchAll(new RegExp('href="[^"\\s]*'+year+'/team/(\\d+)','g'))].map(m=>Number(m[1])))].sort((a,b)=>a-b);
 const row={year,url,status:response.status,bytes:Buffer.byteLength(html),sha256:createHash('sha256').update(html).digest('hex'),count:response.ok&&teams.length?teams.length:null,teams};report.years.push(row);console.log(JSON.stringify({year,status:row.status,count:row.count,bytes:row.bytes}));
 }catch(error){report.years.push({year,url,error:error.message,count:null});console.log(JSON.stringify({year,error:error.message}));}
 fs.writeFileSync(output,JSON.stringify(report,null,2));
}
console.log(JSON.stringify({countedYears:report.years.filter(y=>y.count!==null).length,teamSeasonEntries:report.years.reduce((n,y)=>n+(y.count||0),0),distinctTeamNumbers:new Set(report.years.flatMap(y=>y.teams||[])).size}));
