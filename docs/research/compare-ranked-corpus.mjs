import fs from 'node:fs';
if(process.argv[2]==='archive'){
 const r=await fetch('https://api.github.com/repos/avgupta456/statbotics-csvs/git/trees/HEAD?recursive=1');const j=await r.json();
 fs.writeFileSync(new URL('./statbotics-archive-tree.json',import.meta.url),JSON.stringify(j,null,2));
 console.log(JSON.stringify({status:r.status,sha:j.sha,paths:j.tree?.filter(x=>/team_year|teamyear/i.test(x.path))}));
}
if(process.argv[2]==='csv'){
 const url='https://raw.githubusercontent.com/avgupta456/statbotics-csvs/02113df5bc7c66655fd0496ead62ad4fc5212283/v3/team_years.csv';
 const r=await fetch(url,{signal:AbortSignal.timeout(45000)});if(!r.ok)throw new Error(`HTTP ${r.status}`);
 const text=await r.text();fs.writeFileSync(new URL('./statbotics-team-years.csv',import.meta.url),text);console.log(text.slice(0,3500));
}
const output=new URL('./ranked-corpus-20260920.json',import.meta.url);
const report={checkedAt:new Date().toISOString(),years:[]};
for(let year=2017;!process.argv[2]&&year<=2026;year++){
 const url=`https://api.statbotics.io/v3/team_years?year=${year}&limit=500&metric=epa_end&ascending=false`;
 try {
  const response=await fetch(url,{signal:AbortSignal.timeout(45000),headers:{'User-Agent':'G3-6740-ReadOnly-Corpus-Research/1.0'}});
  const body=await response.json();
  report.years.push({year,url,status:response.status,data:body});
  console.log(JSON.stringify({year,status:response.status,count:Array.isArray(body)?body.length:null,sample:Array.isArray(body)?body[0]:body}));
 }catch(e){report.years.push({year,url,error:e.message});console.log(JSON.stringify({year,error:e.message}));}
 fs.writeFileSync(output,JSON.stringify(report,null,2));
}
