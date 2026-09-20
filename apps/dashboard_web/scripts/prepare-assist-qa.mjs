// Bundle the actual handler for the Supabase editor; never include credentials.
import {build} from 'vite';
import fs from 'node:fs/promises';
import http from 'node:http';
const root=new URL('../../../',import.meta.url);
const out=new URL('docs/staging/assist-qa.local/',root);
await fs.mkdir(out,{recursive:true});
await build({configFile:false,build:{target:'es2022',minify:false,outDir:out.pathname.replace(/^\/(?:([A-Z]):)/,'$1:'),emptyOutDir:false,
 lib:{entry:new URL('backend/supabase/functions/frc-assistant/index.ts',root).pathname.replace(/^\/(?:([A-Z]):)/,'$1:'),formats:['es'],fileName:()=> 'index.ts'},
 rollupOptions:{external:id=>id.startsWith('https://'),output:{inlineDynamicImports:true}}}});
const routes={'/privacy':new URL('backend/supabase/g3_assist_result_privacy_20260920.sql',root),'/admin':new URL('backend/supabase/g3_assist_budget_admin_20260920.sql',root),'/handler':new URL('index.ts',out),'/guards':new URL('backend/supabase/g3_assist_spending_guards_20260920.sql',root)};
http.createServer(async(req,res)=>{if(!routes[req.url]){res.writeHead(404);res.end();return;}const source=await fs.readFile(routes[req.url],'utf8');res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<h1>Isolated QA deployment source — no credentials</h1><textarea aria-label="QA source" style="width:95%;height:80vh">'+source.replaceAll('&','&amp;').replaceAll('<','&lt;')+'</textarea>');}).listen(4231,'127.0.0.1',()=>console.log('QA source: http://127.0.0.1:4231/handler'));
