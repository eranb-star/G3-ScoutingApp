import {useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {useLocalization} from '../lib/localization';
import {supabase} from '../supabase';
import {useMemberAuth} from '../lib/memberAuth';
import {missionOutcome,simulatedTrainingRecord} from '../lib/simulatorTraining';
import type {PracticeRun} from '../lib/twinPractice';
/** Reuses existing shared trial history and Work feedback. No parallel assignment/grade system. */
export default function SimulatorTraining({run,reflection,nextTest}:{run:PracticeRun|null;reflection:string;nextTest:string}){
 const {pick}=useLocalization(),{profile}=useMemberAuth();
 const [tasks,setTasks]=useState<{id:string;title:string}[]>([]),[task,setTask]=useState(()=>new URLSearchParams(location.search).get('task')??''),[status,setStatus]=useState(''),[saved,setSaved]=useState(''),[busy,setBusy]=useState(false);const lock=useRef(false),currentRun=useRef(run?.id);currentRun.current=run?.id;
 useEffect(()=>{let live=true;if(profile)void supabase.from('project_tasks').select('id,title').eq('archived',false).order('updated_at',{ascending:false}).limit(200).then(({data,error})=>{if(live){setTasks(data??[]);if(error)setStatus(pick('Task list unavailable; shared result can still be saved.','רשימת משימות אינה זמינה; עדיין ניתן לשמור תוצאה.'));}});return()=>{live=false;};},[profile?.id]);
 useEffect(()=>{setSaved('');setStatus('');},[run?.id]);
 const result=run?.result,outcome=result?missionOutcome(result):null;
 async function share(){if(!run?.result||!profile||lock.current)return;lock.current=true;setBusy(true);setStatus('');
 try{const record=simulatedTrainingRecord(run.id,run.result,reflection,nextTest);const existing=await supabase.from('robot_trial_sessions').select('id').eq('id',run.id).maybeSingle();if(existing.error)throw existing.error;if(!existing.data){const r=await supabase.from('robot_trial_sessions').insert(record);if(r.error)throw r.error;}
 if(task){const linked=await supabase.from('robot_test_task_links').select('task_id').eq('run_id',run.id).eq('task_id',task).maybeSingle();if(linked.error)throw linked.error;if(!linked.data){const r=await supabase.from('robot_test_task_links').insert({run_id:run.id,task_id:task});if(r.error)throw r.error;}}
 if(currentRun.current===run.id){setSaved(run.id);setStatus(pick('Saved to team history as simulated evidence. Coach feedback belongs in the linked Work task.','נשמר בהיסטוריית הקבוצה כראיה מסימולציה. משוב מאמן נרשם במשימת העבודה המקושרת.'));}
 }catch{if(currentRun.current===run.id)setStatus(pick('Could not finish sharing. Your attempt remains here. Retry safely; the same attempt will not be duplicated.','השיתוף לא הושלם. הניסיון נשאר כאן. ניתן לנסות שוב ללא יצירת כפילות.'));}finally{lock.current=false;setBusy(false);}}
 return <section className="sim-training"><h3>{pick('Team mission & coach review','משימה קבוצתית ומשוב מאמן')}</h3><p>{pick('Assign the mission link in an existing Work task. Students run it, share their result, then receive feedback in that task. Simulated results never qualify physical skills.','שייכו קישור לתרגיל במשימת עבודה קיימת. תלמידים מתרגלים, משתפים תוצאה ומקבלים משוב באותה משימה. סימולציה אינה מסמיכה מיומנות פיזית.')}</p><label>{pick('Existing training task (optional)','משימת תרגול קיימת (אופציונלי)')}<select value={task} disabled={busy||!!saved} onChange={e=>setTask(e.target.value)}><option value="">{pick('No task selected','ללא משימה')}</option>{tasks.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select></label><Link to="/work">{pick('Assign or review in Work','שיוך או משוב בעבודה')} →</Link>
 {outcome&&<><p><strong>{outcome.value} / {outcome.target} · {outcome.passed?pick('Mission target reached','יעד התרגיל הושג'):pick('Target not reached','יעד התרגיל לא הושג')}</strong></p><button disabled={!profile||busy||!!saved||!result?.seconds} onClick={()=>void share()}>{pick(busy?'Saving…':'Share result with team',busy?'שומר…':'שיתוף תוצאה עם הקבוצה')}</button>{!profile&&<p>{pick('Sign in to share; local practice remains available.','התחברו לשיתוף; ניתן לתרגל מקומית.')}</p>}</>}
 {status&&<p role="status">{status}</p>}{saved&&<Link to={`/growth?view=robot-tests&run=${saved}`}>{pick('Open saved result & compare attempts','פתיחת תוצאה והשוואת ניסיונות')} →</Link>}
 </section>;
}
