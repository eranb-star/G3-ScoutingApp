// Local visual harness: actual twin, no team data or authentication bypass in app.
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const app=fileURLToPath(new URL('../',import.meta.url)),root=await fs.mkdtemp(path.join(os.tmpdir(),'g3-twin-'));
const src='/@fs/'+app.replaceAll('\\','/')+'src/';
await fs.writeFile(path.join(root,'index.html'),'<html><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/entry.tsx"></script></html>');
await fs.writeFile(path.join(root,'entry.tsx'),`import React from 'react';import {createRoot} from 'react-dom/client';import {BrowserRouter} from 'react-router-dom';import {LocalizationProvider} from '${src}lib/localization.tsx';import FieldTwinPage from '${src}pages/FieldTwinPage.tsx';import '${src}index.css';import '${src}teamHub.css';createRoot(document.getElementById('root')).render(<BrowserRouter><LocalizationProvider><FieldTwinPage/></LocalizationProvider></BrowserRouter>);`);
const server=await createServer({configFile:false,root,publicDir:path.join(app,'public'),plugins:[react()],resolve:{dedupe:['react','react-dom'],alias:{react:path.join(app,'node_modules/react'),'react-dom':path.join(app,'node_modules/react-dom'),'react-router-dom':path.join(app,'node_modules/react-router-dom')}},server:{host:'127.0.0.1',port:4213,strictPort:true,fs:{allow:[root,app]}}});
await server.listen();console.log('Twin visual harness http://127.0.0.1:4213/');
