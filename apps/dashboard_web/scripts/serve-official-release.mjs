// Local review/deployment transport. Contains source and migrations, never credentials.
import {build} from 'vite';import fs from 'node:fs/promises';import http from 'node:http';import path from 'node:path';
const root=path.resolve(process.env.RELEASE_ROOT??'../..'),out=path.resolve('../../docs/staging/official-release.local');await fs.mkdir(out,{recursive:true});
for(const name of ['knowledge-source-check','frc-assistant'])await build({configFile:false,build:{target:'es2022',minify:false,outDir:out,emptyOutDir:false,lib:{entry:path.join(root,`backend/supabase/functions/${name}/index.ts`),formats:['es'],fileName:()=>name+'.ts'},rollupOptions:{external:id=>id.startsWith('https://')||id.startsWith('npm:'),output:{inlineDynamicImports:true}}}});
http.createServer(async(req,res)=>{
 const sources={'/ingest':path.join(out,'knowledge-source-check.ts'),'/assistant':path.join(out,'frc-assistant.ts'),'/migration':path.join(root,'backend/supabase/knowledge_document_ingestion_20260924.sql'),'/software-migration':path.join(root,'backend/supabase/software_mentor_context_20260924.sql')};
 const file=sources[req.url];if(!file){res.writeHead(404);res.end();return;}
 const source=await fs.readFile(file,'utf8');res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<h1>Official document release transport</h1><textarea aria-label="Release source" style="width:95%;height:80vh">'+source.replaceAll('&','&amp;').replaceAll('<','&lt;')+'</textarea>');
}).listen(4242,'127.0.0.1',()=>console.log('http://127.0.0.1:4242/migration'));
