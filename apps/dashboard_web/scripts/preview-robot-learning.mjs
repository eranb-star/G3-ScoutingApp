// Actual learning component and verified local CAD. No auth, database or AI calls.
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const app=fileURLToPath(new URL('../',import.meta.url));
const root=await fs.mkdtemp(path.join(os.tmpdir(),'g3-robot-learning-'));
const src='/@fs/'+app.replaceAll('\\','/')+'src/';
await fs.writeFile(path.join(root,'index.html'),'<html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>G3 Robot learning lab · local review</title><div id="root"></div><script type="module" src="/entry.tsx"></script></html>');
await fs.writeFile(path.join(root,'entry.tsx'),`import React from 'react';import{createRoot}from'react-dom/client';import Lab from '${src}components/RobotLearningLab.tsx';const he=location.search.includes('he');document.documentElement.dir=he?'rtl':'ltr';document.documentElement.lang=he?'he':'en';document.body.style.cssText='margin:0;background:#f5f3f8;font-family:Arial,sans-serif;padding:20px';createRoot(document.getElementById('root')).render(<><nav style={{padding:10}}><a href="/">English</a> · <a href="/?he">עברית</a> · Local review</nav><Lab pick={(en,hw)=>he?hw:en}/></>);`);
const server=await createServer({configFile:false,root,publicDir:path.join(app,'public'),plugins:[react()],resolve:{dedupe:['react','react-dom'],alias:{react:path.join(app,'node_modules/react'),'react-dom':path.join(app,'node_modules/react-dom')}},server:{host:'127.0.0.1',port:4254,strictPort:true,fs:{allow:[root,app]}}});
await server.listen();console.log('Robot learning lab: http://127.0.0.1:4254/');
