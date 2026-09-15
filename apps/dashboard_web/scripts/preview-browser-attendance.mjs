// Isolated UI fixture: synthetic records, no network or attendance writes.
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const app=fileURLToPath(new URL('../',import.meta.url));
const root=await fs.mkdtemp(path.join(os.tmpdir(),'g3-attendance-ui-'));
const src='/@fs/'+app.replaceAll('\\','/')+'src/';
await fs.writeFile(path.join(root,'index.html'),'<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/entry.tsx"></script>');
await fs.writeFile(path.join(root,'entry.tsx'),`import React from 'react';import{createRoot}from'react-dom/client';import{BrowserRouter}from'react-router-dom';import{CheckInPage}from'${src}pages/TeamHubPages.tsx';import'${src}index.css';import'${src}teamHub.css';document.documentElement.dir=location.search.includes('he')?'rtl':'ltr';createRoot(document.getElementById('root')).render(<BrowserRouter><p>LOCAL FIXTURE — no attendance writes</p><CheckInPage/></BrowserRouter>);`);
const mock=`const p=new URLSearchParams(location.search);export const useLocalization=()=>({pick:(en,he)=>p.has('he')?he:en});export const useMemberAuth=()=>({profile:{id:'fixture',role:'member'}});const meeting={id:'fixture',title:'Workshop session',status:'open',starts_at:new Date(Date.now()-3600000).toISOString(),ends_at:new Date(Date.now()+3600000).toISOString()};export const supabase={from(table){let single=false;const q=new Proxy({}, {get(_,key){if(key==='then')return done=>Promise.resolve({data:table==='team_meetings'?[meeting]:null,error:null}).then(done);if(key==='maybeSingle')return()=>Promise.resolve({data:p.has('out')&&table==='attendance_records'?{meeting_id:'fixture',checked_in_at:new Date().toISOString(),checked_out_at:null}:null,error:null});return()=>q;}});return q;},functions:{invoke:async()=>({error:{},data:{error:'Fixture: submission disabled.'}})}};`;
const server=await createServer({configFile:false,root,plugins:[{name:'fixture',enforce:'pre',resolveId(id){if(/(?:lib\/(?:localization|memberAuth)|\/supabase)$/.test(id))return '\0fixture';},load(id){if(id==='\0fixture')return mock;}},react()],resolve:{dedupe:['react','react-dom'],alias:{react:path.join(app,'node_modules/react'),'react-dom':path.join(app,'node_modules/react-dom'),'react-router-dom':path.join(app,'node_modules/react-router-dom')}},server:{host:'127.0.0.1',port:4215,strictPort:true,fs:{allow:[app,root]}}});
await server.listen();console.log('http://127.0.0.1:4215/ — ?he&out for Hebrew checkout. No writes.');
