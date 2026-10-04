// Local source transport for dashboard deployment. No credentials.
import {build} from 'vite';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
const root=path.resolve('../..'),out=path.join(root,'docs/staging/cad-release.local');
await fs.mkdir(out,{recursive:true});
await build({configFile:false,build:{target:'es2022',minify:false,outDir:out,emptyOutDir:false,lib:{entry:path.join(root,'backend/supabase/functions/onshape-connector/index.ts'),formats:['es'],fileName:()=> 'connector.ts'},rollupOptions:{external:id=>id.startsWith('https://'),output:{inlineDynamicImports:true}}}});
const sql=(await fs.readFile(path.join(root,'backend/supabase/cad_onshape_connection_20261004.sql'),'utf8'))+'\n'+(await fs.readFile(path.join(root,'backend/supabase/cad_vault_key_20261004.sql'),'utf8'));
http.createServer(async(req,res)=>{let text;if(req.url==='/migration')text=sql;else if(req.url==='/workflow')text=await fs.readFile(path.join(root,'backend/supabase/cad_review_workflow_20261004.sql'),'utf8');else if(req.url==='/connector')text=await fs.readFile(path.join(out,'connector.ts'),'utf8');else{res.writeHead(404);res.end();return;}res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<h1>CAD connector deployment source</h1><textarea aria-label="Release source" style="width:95%;height:80vh">'+text.replaceAll('&','&amp;').replaceAll('<','&lt;')+'</textarea>');}).listen(4247,'127.0.0.1',()=>console.log('CAD source transport: http://127.0.0.1:4247/migration'));
