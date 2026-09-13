// Visual fixture only: real components, synthetic data, no Supabase connection.
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const app=fileURLToPath(new URL('../',import.meta.url));
const root=await fs.mkdtemp(path.join(os.tmpdir(),'g3-engineering-ui-'));
const src='/@fs/'+app.replaceAll('\\','/')+'src/';
await fs.writeFile(path.join(root,'index.html'),'<html><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/entry.tsx"></script></html>');
await fs.writeFile(path.join(root,'entry.tsx'),`
import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
import {EngineeringRecords} from '${src}components/EngineeringRecords.tsx';import {ReviewEvidenceEditor} from '${src}components/ReviewEvidence.tsx';
import ProjectConfigurations from '${src}components/ProjectConfigurations.tsx';import StageReviewers from '${src}components/StageReviewers.tsx';
import '${src}index.css';import '${src}teamHub.css';
const he=new URLSearchParams(location.search).has('he');document.documentElement.dir=he?'rtl':'ltr';
function App(){const[items,setItems]=useState([{title:'',revision:'',url:''}]);return <main style={{width:'100%',maxWidth:new URLSearchParams(location.search).has('mobile')?358:880,boxSizing:'border-box',margin:'16px auto',padding:16,background:'white',display:'grid',gap:20}}><h1 style={{fontSize:24}}>{he?'ביקורת הנדסית':'Engineering review'}</h1><EngineeringRecords projectId="qa" canManage people={[{id:'mentor',display_name:he?'מנטור בדיקה':'QA Mentor'}]} tasks={[{id:'task',title:he?'אימות אב־טיפוס':'Validate prototype'}]}/><ReviewEvidenceEditor items={items} onChange={setItems} disabled={false}/><ProjectConfigurations projectId="qa"/><StageReviewers taskId="task" primary="mentor" onSaved={async()=>{}}/></main>;}createRoot(document.getElementById('root')).render(<App/>);`);
const fixture=`function data(table){return table==='team_members'?[{id:'mentor',display_name:'QA Mentor'},{id:'mentor2',display_name:'QA Mechanical Mentor'}]:table==='project_robot_configurations'?[{id:'design',name:'Robot design',revision:'D1',configuration_kind:'designed',details:'Synthetic'}]:table==='project_physical_assets'?[{id:'asset',name:'QA Prototype',serial:'QA-001'}]:[];}export const supabase={from(table){const c={select:()=>c,eq:()=>c,in:()=>c,or:()=>c,ilike:()=>c,limit:()=>c,order:()=>c,single:()=>Promise.resolve({data:{review_mode:'parallel',reviewer_disciplines:['CAD']},error:null}),then:f=>Promise.resolve({data:data(table),error:null}).then(f)};return c;},rpc:async()=>({data:null,error:null})};`;
const server=await createServer({configFile:false,root,plugins:[{name:'engineering-visual-fixture',enforce:'pre',resolveId(id){if(id.endsWith('/supabase'))return '\0fixture-db';if(id.endsWith('/lib/localization'))return '\0fixture-language';if(id.endsWith('/lib/projectRefresh'))return '\0fixture-refresh';},load(id){if(id==='\0fixture-db')return fixture;if(id==='\0fixture-language')return "export const useLocalization=()=>({pick:(en,he)=>new URLSearchParams(location.search).has('he')?he:en});";if(id==='\0fixture-refresh')return 'export const notifyProjectChange=()=>{};export const useProjectRefresh=()=>{};';}},react()],resolve:{dedupe:['react','react-dom'],alias:{react:path.join(app,'node_modules/react'),'react-dom':path.join(app,'node_modules/react-dom')}},server:{host:'127.0.0.1',port:4210,strictPort:true,fs:{allow:[app,root]}}});
await server.listen();console.log('Visual engineering fixture http://127.0.0.1:4210/');
