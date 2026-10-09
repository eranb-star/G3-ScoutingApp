import {lazy,Suspense,useEffect,useState} from 'react';
import {supabase} from '../supabase';
import {useLocalization} from '../lib/localization';
import {partOccurrenceIds} from '../lib/buildPartGeometry';
import type {CadGeometry} from './CadDesignViewer';
import '../pages/CadMentorPage.css';
const CadDesignViewer=lazy(()=>import('./CadDesignViewer'));
export default function BuildPartModel({snapshotId,paths,partId}:{snapshotId:string|null;paths:unknown;partId?:string}){
 const {pick}=useLocalization();const [geometry,setGeometry]=useState<CadGeometry|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[occurrence,setOccurrence]=useState('');
 const ids=partOccurrenceIds(paths,partId);
 useEffect(()=>{setGeometry(null);setError('');setOccurrence('');},[snapshotId,partId]);
 if(!snapshotId)return null;
 async function open(){setBusy(true);setError('');setGeometry(null);try{
 const asset=await supabase.functions.invoke('onshape-connector',{body:{action:'geometry',snapshotId}});if(asset.error||asset.data?.error||asset.data?.snapshotId!==snapshotId)throw Error(pick('The pinned CAD revision could not be opened. No newer revision was substituted.','לא ניתן לפתוח את גרסת ה-CAD המקובעת. לא הוחלפה בגרסה חדשה יותר.'));
 const url=new URL(asset.data.url);if(url.origin!=='https://hnqwhuuxlqfyawqymaaz.supabase.co'||!url.pathname.startsWith('/storage/v1/object/sign/cad-design-assets/'))throw Error('Invalid geometry destination');
 const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error(pick('Geometry download failed. Retry.','הורדת הגאומטריה נכשלה. נסו שוב.'));const model=await r.json() as CadGeometry;
 if(model.units!=='m'||!Array.isArray(model.meshes))throw Error('Unsupported geometry');
 const matched=ids.filter(id=>model.meshes.some(m=>m.id===id));if(!matched.length)throw Error(pick('This exact occurrence is absent from the imported geometry. The structural parts list can be more complete than the display; do not use a similarly named part as a substitute.','המופע המדויק חסר בגאומטריה שיובאה. רשימת החלקים המבנית עשויה להיות מלאה יותר מהתצוגה; אין להחליף בחלק בעל שם דומה.'));
 setGeometry(model);setOccurrence(matched[0]);
 }catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <section><button type="button" disabled={busy} onClick={()=>void open()}>{busy?pick('Opening pinned geometry…','פותח גאומטריה מקובעת…'):pick('Inspect this part in 3D','בדיקת חלק זה בתלת־ממד')}</button>{error&&<p role="alert">{error}</p>}{geometry&&<><p>{pick('Imported geometry from this parts-list snapshot. It is not a manufacturing release or proof of physical fit.','גאומטריה שיובאה מתמונת המצב של רשימת חלקים זו. אינה שחרור לייצור או הוכחת התאמה פיזית.')}</p><label>{pick('Exact occurrence in the assembly','המופע המדויק בהרכבה')}<select value={occurrence} onChange={e=>setOccurrence(e.target.value)}>{ids.map((id,i)=><option key={id} value={id} disabled={!geometry.meshes.some(m=>m.id===id)}>{i+1} · {id}{!geometry.meshes.some(m=>m.id===id)?' · '+pick('not rendered','לא מוצג'):''}</option>)}</select></label><Suspense fallback={<p role="status">{pick('Loading viewer…','טוען תצוגה…')}</p>}><CadDesignViewer geometry={geometry} initialSelection={occurrence}/></Suspense></>}</section>;
}
