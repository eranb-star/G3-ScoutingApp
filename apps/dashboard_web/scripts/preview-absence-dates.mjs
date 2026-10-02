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
await fs.writeFile(path.join(root,'entry.tsx'),`import React from 'react';import{createRoot}from'react-dom/client';import{BrowserRouter}from'react-router-dom';import AttendanceReportsPage from'${src}pages/AttendanceReportsPage.tsx';import'${src}index.css';import'${src}teamHub.css';document.documentElement.dir=location.search.includes('he')?'rtl':'ltr';createRoot(document.getElementById('root')).render(<BrowserRouter><p>LOCAL FIXTURE — no attendance writes</p><AttendanceReportsPage/></BrowserRouter>);`);
const mock=`const p=new URLSearchParams(location.search);export const useLocalization=()=>({language:p.has('he')?'he':'en',pick:(en,he)=>p.has('he')?he:en});export const useMemberAuth=()=>({profile:{id:'fixture-admin',role:'admin',display_name:'Fixture mentor'}});export const useAccessControl=()=>({can:()=>true});
const rows={team_members:[{id:'fixture-student',display_name:'Example student',subteam:'Software',active:true}],team_calendar_events:[{id:'event',title:'Workshop · CAN wiring',starts_at:'2026-10-08T14:00:00Z',ends_at:'2026-10-08T17:00:00Z',cancelled:false,mandatory:true}],absence_requests:[{id:'request',member_id:'fixture-student',calendar_event_id:'event',reason:'Family commitment',status:'pending',created_at:'2026-10-02T09:30:00Z',reviewer_note:null,reviewed_at:null}],attendance_records:[],team_meetings:[]};export const supabase={from(table){const q=new Proxy({}, {get(_,key){if(key==='then')return done=>Promise.resolve({data:rows[table]??[],error:null}).then(done);if(['insert','update','delete'].includes(key))return()=>{throw Error('Fixture: writes disabled')};return()=>q;}});return q;},rpc:async()=>({error:{message:'Fixture: writes disabled'}})};`;

const server=await createServer({configFile:false,root,plugins:[{name:'fixture',enforce:'pre',resolveId(id){if(/(?:lib\/(?:localization|memberAuth|accessControl)|\/supabase)$/.test(id))return '\0fixture';},load(id){if(id==='\0fixture')return mock;}},react()],resolve:{dedupe:['react','react-dom'],alias:{react:path.join(app,'node_modules/react'),'react-dom':path.join(app,'node_modules/react-dom'),'react-router-dom':path.join(app,'node_modules/react-router-dom')}},server:{host:'127.0.0.1',port:4283,strictPort:true,fs:{allow:[app,root]}}});
await server.listen();console.log('http://127.0.0.1:4283/?view=absences — add &he for Hebrew. Synthetic data; writes disabled.');

