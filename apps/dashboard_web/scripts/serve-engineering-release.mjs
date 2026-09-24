// Local source transport for dashboard deployment; never reads credentials.
import {build} from 'vite';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
const root=path.resolve(process.env.RELEASE_ROOT??'../..');
const out=path.resolve('../../docs/staging/engineering-release.local');
await fs.mkdir(out,{recursive:true});
await build({configFile:false,build:{target:'es2022',minify:false,outDir:out,emptyOutDir:false,lib:{entry:path.join(root,'backend/supabase/functions/frc-assistant/index.ts'),formats:['es'],fileName:()=> 'frc-assistant.ts'},rollupOptions:{external:id=>id.startsWith('https://')||id.startsWith('npm:'),output:{inlineDynamicImports:true}}}});
const migrations=['season_rule_authority_20260924.sql','engineering_plans_20260924.sql','season_planning_policy_20260924.sql'];
const sources={'/qa':()=>fs.readFile(path.join(root,'backend/supabase/verify_engineering_qa_20260924.sql'),'utf8'),'/schema':async()=> (await Promise.all(migrations.map(n=>fs.readFile(path.join(root,'backend/supabase',n),'utf8')))).join('\n'),'/seed':()=>fs.readFile(path.join(root,'backend/supabase/season_scoring_2026_tu22_20260924.sql'),'utf8'),'/assistant':()=>fs.readFile(path.join(out,'frc-assistant.ts'),'utf8')};
http.createServer(async(req,res)=>{try{const read=sources[req.url];if(!read){res.writeHead(404);res.end();return;}const source=await read();res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<h1>Engineering release source</h1><textarea aria-label="Release source" style="width:95%;height:80vh">'+source.replaceAll('&','&amp;').replaceAll('<','&lt;')+'</textarea>');}catch{res.writeHead(500);res.end('Source unavailable');}}).listen(4247,'127.0.0.1',()=>console.log('Release transport http://127.0.0.1:4247/schema'));
