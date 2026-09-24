import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {supabase} from '../supabase';
import {useMemberAuth} from '../lib/memberAuth';
import {useLocalization} from '../lib/localization';
import {reviewDraftKey} from '../lib/reviewDraft';
import type {SoftwareSelection} from './SoftwareMentorContext';
export default function SoftwareReviewHandoff({answer,context,citations}:{answer:string;context:SoftwareSelection;citations:{title:string;url:string}[]}){
 const {profile}=useMemberAuth(),{pick}=useLocalization(),navigate=useNavigate();
 const [tasks,setTasks]=useState<{task_id:string;project_id:string;title:string;submission:{id:string}|null}[]|null>(null),[task,setTask]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 async function load(){setBusy(true);try{const r=await supabase.rpc('project_review_context',{p_all:true});if(r.error)throw r.error;setTasks(r.data??[]);}catch{setMessage(pick('Could not load existing review tasks.','לא ניתן לטעון משימות ביקורת קיימות.'));}finally{setBusy(false);}}
 function prepare(){const selected=tasks?.find(t=>t.task_id===task);if(!selected||!profile)return;
  try{const key=reviewDraftKey(profile.id,task);if(sessionStorage.getItem(key)){setMessage(pick('This task already has a saved review draft. Open it in Projects first; it will not be overwritten.','למשימה זו כבר יש טיוטת ביקורת. פתחו אותה בפרויקטים תחילה; היא לא תידרס.'));return;}
   const items=citations.filter(c=>c.url.startsWith(`https://github.com/${context.repository}/blob/`)).slice(0,12).map(c=>({title:c.title.slice(0,160),url:c.url,revision:c.url.split('/blob/')[1].split('/')[0],artifact_type:'code',source_id:c.url.split('/blob/')[1].split('/')[0]}));
   if(!items.length)throw Error('No code citations');
   const notes=`AI-generated findings — not mentor approval; no code executed.\n${context.repository} @ ${context.revision}\n${answer}`;
   if(notes.length>5000){setMessage(pick('The answer is too long for review notes. Save it as knowledge and link that article from the task.','התשובה ארוכה מדי להערות ביקורת. שמרו כידע וקשרו את המאמר למשימה.'));return;}
   sessionStorage.setItem(key,JSON.stringify({revision:context.revision,items,notes,expectedSubmission:selected.submission?.id??null}));
   navigate(`/projects?project=${selected.project_id}&task=${task}`);
  }catch{setMessage(pick('Could not prepare the review draft on this device.','לא ניתן להכין טיוטת ביקורת במכשיר זה.'));}
 }
 return <div className="software-mentor"><button disabled={busy} onClick={()=>void load()}>{pick('Prepare mentor review on an existing task','הכנת ביקורת מנטור במשימה קיימת')}</button>{tasks&&<><label>{pick('Task with a mentor checkpoint','משימה עם ביקורת מנטור')}<select value={task} onChange={e=>setTask(e.target.value)}><option value="">{pick('Choose a task','בחרו משימה')}</option>{tasks.map(t=><option key={t.task_id} value={t.task_id}>{t.title}</option>)}</select></label><p>{pick('The findings and exact code links will be prefilled. Open Submit for review in the task, check the draft and submit yourself. Existing permissions and approvals apply.','הממצאים וקישורי הקוד ימולאו בטיוטה. פתחו הגשה לביקורת במשימה, בדקו והגישו בעצמכם. ההרשאות והאישורים הקיימים חלים.')}</p>{!tasks.length&&<p>{pick('No review tasks are available. Configure a mentor checkpoint in Projects.','אין משימות ביקורת זמינות. הגדירו ביקורת מנטור בפרויקטים.')}</p>}<button disabled={!task} onClick={prepare}>{pick('Open task with draft','פתיחת המשימה עם טיוטה')}</button></>}{message&&<p role="status">{message}</p>}</div>;
}
