import {useState} from 'react';
import {supabase} from '../supabase';
import {useLocalization} from '../lib/localization';
/** Recovery uses the original manifest ID; it cannot replace already uploaded bytes. */
export default function BuildPendingFile({id,name,ownerId,saved}:{id:string;name:string;ownerId:string;saved:()=>Promise<void>}){
 const {pick}=useLocalization();const [file,setFile]=useState<File|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function finish(upload:boolean){if(busy)return;setBusy(true);setError('');try{
  if(upload){if(!file||file.name!==name||file.size===0||file.size>20971520)throw Error(pick('Choose the original named file, up to 20 MB.','בחרו את הקובץ המקורי בשם המוצג, עד 20 MB.'));
   const r=await supabase.storage.from('robot-build-files').upload(`${ownerId}/${id}`,file,{upsert:false,contentType:'application/octet-stream'});if(r.error&&String((r.error as {statusCode?:string}).statusCode)!=='409')throw r.error;
  }
  const r=await supabase.functions.invoke('robot-build-files',{body:{action:'finalize',fileId:id}});if(r.error||r.data?.error)throw Error(pick('Verification is not confirmed. If the upload was interrupted, select the original file and resume below.','האימות לא אושר. אם ההעלאה נקטעה, בחרו את הקובץ המקורי והמשיכו להלן.'));await saved();
 }catch(e){setError((e as {message?:string}).message??pick('Recovery failed. Retry without changing the file.','השחזור נכשל. נסו שוב ללא שינוי בקובץ.'));}finally{setBusy(false);}}
 return <div><p>{pick('This upload is unfinished. Retry verification first. If necessary, resume the original file; existing stored bytes are never overwritten.','ההעלאה טרם הסתיימה. נסו תחילה לאמת. במידת הצורך המשיכו עם הקובץ המקורי; תוכן שכבר נשמר לא יוחלף.')}</p>{error&&<p role="alert">{error}</p>}<button type="button" disabled={busy} onClick={()=>void finish(false)}>{pick('Retry stored-file verification','ניסיון חוזר לאימות הקובץ שנשמר')}</button><details><summary>{pick('Resume interrupted upload','המשך העלאה שנקטעה')}</summary><label>{name}<input type="file" disabled={busy} onChange={e=>setFile(e.target.files?.[0]??null)}/></label><button type="button" disabled={busy||!file} onClick={()=>void finish(true)}>{busy?pick('Verifying…','מאמת…'):pick('Resume and verify original file','המשך ואימות הקובץ המקורי')}</button></details></div>;
}
