import {useState} from 'react';
import {Link,useNavigate} from 'react-router-dom';
import {useLocalization} from '../lib/localization';
import {useMemberAuth} from '../lib/memberAuth';
import {saveSoftwareContext} from '../lib/softwareWorkingContext';
import {robotPurposes} from '../lib/robotRepositories';
import {supabase} from '../supabase';
export const softwareReviewDraftKey=(id:string)=>'g3-software-review-draft:'+id;
type Repo={owner:string;name:string;defaultBranch:string;archived?:boolean};
export default function SoftwareReviewStart({repositories}:{repositories:Repo[]}){
 const {pick}=useLocalization(),{profile}=useMemberAuth(),navigate=useNavigate();
 const [repository,setRepository]=useState(''),[ref,setRef]=useState(''),[baseRef,setBaseRef]=useState(''),[purpose,setPurpose]=useState('explain'),[question,setQuestion]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [hasDraft,setHasDraft]=useState(()=>{try{return !!profile&&!!sessionStorage.getItem(softwareReviewDraftKey(profile.id));}catch{return false;}});
 const prompts:Record<string,[string,string]>={explain:['Explain how this subsystem works, its commands and dependencies.','הסבירו כיצד תת־המערכת פועלת, הפקודות והתלויות שלה.'],diagnose:['Investigate this observed problem: … Include evidence, possible causes and a test plan.','בדקו את התקלה שנצפתה: … הציגו ראיות, גורמים אפשריים ותוכנית בדיקה.'],review:['Review these changes for defects, behavior changes and missing tests.','בדקו שינויים אלה לאיתור תקלות, שינויי התנהגות ובדיקות חסרות.'],plan:['Plan this implementation: … Identify the actual files to change and tests needed.','תכננו את המימוש הבא: … זהו את הקבצים לשינוי והבדיקות הדרושות.']};
 async function prepare(){if(!profile)return;setBusy(true);setError('');try{
  const {data,error}=await supabase.functions.invoke('frc-assistant',{body:purpose==='review'?{action:'prepare-software-change',repository,ref:ref.trim(),baseRef:baseRef.trim()}:{action:'select-software',repository,ref:ref.trim(),question}});
  if(error||data?.error){let message=data?.error;if(error&&'context'in error){try{message=(await (error.context as Response).clone().json()).error;}catch{}}throw Error(message||pick('Could not read this code. Check permission and revision, then retry.','לא ניתן לקרוא את הקוד. בדקו הרשאות וגרסה ונסו שוב.'));}
  if(!data.paths?.length)throw Error(pick('No supported source changes were found between these revisions.','לא נמצאו שינויי מקור נתמכים בין הגרסאות.'));
  const selection={repository,revision:data.revision,base:data.base,paths:data.paths.slice(0,6),mode:purpose==='plan'?'explain':purpose,automatic:true};
  sessionStorage.setItem(softwareReviewDraftKey(profile.id),JSON.stringify({selection,question,changes:data.changes??null,totalPaths:data.paths.length}));
  saveSoftwareContext(profile.id,{repository,revision:data.revision});
  navigate('/assistant?from=software&reviewDraft=1');
 }catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <section className="software-review-start"><div className="software-step-heading"><div><h3>{pick('Start a code review','התחלת ביקורת קוד')}</h3><p>{pick('Choose code → prepare evidence → review with G3 Assist','בחירת קוד ← הכנת ראיות ← ביקורת עם G3 Assist')}</p></div><Link to="/assistant?from=software&history=1">{pick('My previous reviews','הביקורות הקודמות שלי')} →</Link></div>
 {hasDraft&&<p><Link to="/assistant?from=software&reviewDraft=1">{pick('Resume prepared review on this device','המשך ביקורת שהוכנה במכשיר זה')}</Link> · <button type="button" onClick={()=>{if(profile){try{sessionStorage.removeItem(softwareReviewDraftKey(profile.id));setHasDraft(false);}catch{setError(pick('Browser storage unavailable.','אחסון הדפדפן אינו זמין.'));}}}}>{pick('Discard draft','ביטול טיוטה')}</button></p>}
 <form onSubmit={e=>{e.preventDefault();void prepare();}}><div className="software-form-grid"><label>{pick('Repository','מאגר')}<select required disabled={busy} value={repository} onChange={e=>{setRepository(e.target.value);setRef(repositories.find(r=>r.owner+'/'+r.name===e.target.value)?.defaultBranch??'');setError('');}}><option value="">{pick('Choose robot code','בחירת קוד רובוט')}</option>{repositories.map(r=><option key={r.owner+'/'+r.name} value={r.owner+'/'+r.name}>{r.name}{r.archived?' · archived':''}</option>)}</select></label><label>{pick('Branch, tag or commit','ענף, תג או קומיט')}<input required disabled={busy} value={ref} maxLength={120} onChange={e=>setRef(e.target.value)} dir="ltr"/></label></div>
 {repository&&robotPurposes[repository.split('/')[1]]&&<p className="software-purpose">{pick(...robotPurposes[repository.split('/')[1]])}</p>}
 <label>{pick('What do you need?','מה נדרש?')}<select disabled={busy} value={purpose} onChange={e=>{setPurpose(e.target.value);setQuestion(pick(...prompts[e.target.value]));}}><option value="explain">{pick('Understand code','הבנת קוד')}</option><option value="diagnose">{pick('Diagnose a problem','אבחון תקלה')}</option><option value="review">{pick('Review changes between revisions','ביקורת שינויים בין גרסאות')}</option><option value="plan">{pick('Plan an implementation','תכנון מימוש')}</option></select></label>
 {purpose==='review'&&<label>{pick('Compare against this base branch, tag or commit','השוואה לענף, תג או קומיט בסיס')}<input required disabled={busy} value={baseRef} maxLength={120} onChange={e=>setBaseRef(e.target.value)} dir="ltr"/></label>}
 <label>{pick('Question or goal · name the subsystem and expected behavior','שאלה או מטרה · ציינו תת־מערכת והתנהגות צפויה')}<textarea required disabled={busy} rows={3} maxLength={6000} value={question} placeholder={pick(...prompts[purpose])} onChange={e=>setQuestion(e.target.value)}/></label>
 <p>{pick('Preparation reads GitHub only. You inspect the selected code before sending it to Gemini. Reviews remain in your personal Assist history; share a reviewed follow-up task when ready.','ההכנה קוראת מ-GitHub בלבד. תבדקו את הקוד שנבחר לפני שליחתו ל-Gemini. הביקורות נשמרות בהיסטוריית Assist האישית; ניתן לשתף משימת המשך לאחר בדיקה.')}</p>
 <p>{pick('Unpublished changes on a laptop are not available here. Push them to your connected GitHub repository before preparing a review.','שינויים שלא פורסמו מהמחשב אינם זמינים כאן. העלו אותם למאגר GitHub המחובר לפני הכנת ביקורת.')}</p>
 {error&&<p role="alert">{error}</p>}<button className="primary" disabled={busy||!repository||!ref.trim()||!question.trim()}>{busy?pick('Preparing code…','מכין קוד…'):pick('Prepare code review','הכנת ביקורת קוד')} →</button></form></section>;
}
