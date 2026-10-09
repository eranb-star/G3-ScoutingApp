import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
const root=path.resolve('../..');
const observed=JSON.parse(fs.readFileSync(path.join(root,'docs/staging/robot-build-function-preflight-20261009.json'),'utf8'));
const candidates=new Map();
for(const name of fs.readdirSync(path.join(root,'backend/supabase')).filter(n=>n.endsWith('.sql'))){
 const sql=fs.readFileSync(path.join(root,'backend/supabase',name),'utf8').replaceAll('\r\n','\n');
 for(const m of sql.matchAll(/create\s+(?:or\s+replace\s+)?function\s+public\.(\w+)\s*\([^;]*?\bas\s*\$\$([\s\S]*?)\$\$/gi)){
  for(const body of [m[2],m[2].replaceAll('\n','\r\n')]){
   const hash=crypto.createHash('md5').update(body).digest('hex');
   candidates.set(`${m[1]}:${hash}`,name);
  }
 }
}
for(const row of observed){const file=candidates.get(`${row.proname}:${row.body_md5}`);console.log(`${file?'MATCH':'REVIEW'} ${row.proname}${file?' '+file:''}`);}
// Dynamically altered function bodies require definition review, not an assumed match.
