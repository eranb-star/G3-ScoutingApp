// Reproducible release transport: only committed isolated candidate files.
import {build} from 'vite';
import fs from 'node:fs/promises';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
const root=new URL('../../../docs/staging/knowledge-release.local/',import.meta.url);
const out=new URL('../assist-production.local/',root);await fs.mkdir(out,{recursive:true});
await build({configFile:false,build:{target:'es2022',minify:false,outDir:fileURLToPath(out),emptyOutDir:false,lib:{entry:fileURLToPath(new URL('backend/supabase/functions/frc-assistant/index.ts',root)),formats:['es'],fileName:()=> 'index.ts'},rollupOptions:{external:id=>id.startsWith('https://'),output:{inlineDynamicImports:true}}}});
const files=['g3_assist_permission','knowledge_article_reviews','g3_assist_budget','g3_assist_budget_admin','g3_assist_executions','g3_assist_spending_guards','g3_assist_result_privacy'];
const sql=(await Promise.all(files.map(f=>fs.readFile(new URL('backend/supabase/'+f+'_20260920.sql',root),'utf8')))).join('\n');
await fs.writeFile(new URL('release.sql',out),sql);
http.createServer(async(req,res)=>{const file=req.url==='/sql'?'release.sql':req.url==='/handler'?'index.ts':null;if(!file){res.writeHead(404);res.end();return;}const source=await fs.readFile(new URL(file,out),'utf8');res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<h1>Production candidate 34d7741 — no secrets</h1><textarea aria-label="Release source" style="width:95%;height:80vh">'+source.replaceAll('&','&amp;').replaceAll('<','&lt;')+'</textarea>');}).listen(4233,'127.0.0.1',()=>console.log('http://127.0.0.1:4233/sql'));
