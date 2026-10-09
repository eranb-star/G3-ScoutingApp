import {useEffect,useRef,useState} from 'react';
import {useLocalization} from '../lib/localization';
import {numericLogSummary,type RobotLog} from '../lib/robotLog';
import '../styles/robotLog.css';

export default function RobotLogInspector(){
 const {pick}=useLocalization(),worker=useRef<Worker|null>(null),ticket=useRef(0);
 const [log,setLog]=useState<RobotLog|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[name,setName]=useState(''),[hash,setHash]=useState(''),[query,setQuery]=useState(''),[selected,setSelected]=useState(-1);
 useEffect(()=>()=>{ticket.current++;worker.current?.terminate();},[]);
 async function open(file:File){
  const request=++ticket.current;worker.current?.terminate();setLog(null);setSelected(-1);setHash('');setError('');setName(file.name);setBusy(true);
  if(file.size>32*1024*1024){setError(pick('Choose a WPILOG file up to 32 MB.','בחרו קובץ WPILOG עד 32 MB.'));setBusy(false);return;}
  try{
   const buffer=await file.arrayBuffer();if(request!==ticket.current)return;
   const digest=await crypto.subtle.digest('SHA-256',buffer);if(request!==ticket.current)return;
   setHash(Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join(''));
   const task=new Worker(new URL('../lib/robotLog.worker.ts',import.meta.url),{type:'module'});worker.current=task;
   task.onmessage=e=>{if(request!==ticket.current)return;setBusy(false);task.terminate();if(e.data.error)setError(pick('This file could not be read: ','לא ניתן לקרוא את הקובץ: ')+e.data.error);else setLog(e.data.log);};
   task.onerror=()=>{if(request!==ticket.current)return;setBusy(false);task.terminate();setError(pick('Log reader failed. Try a smaller file.','קריאת הלוג נכשלה. נסו קובץ קטן יותר.'));};
   task.postMessage(buffer,[buffer]);
  }catch{if(request===ticket.current){setBusy(false);setError(pick('Could not open this file.','לא ניתן לפתוח את הקובץ.'));}}
 }
 const channel=log?.channels.find(c=>c.generation===selected),stats=channel?numericLogSummary(channel):null;
 const visible=log?.channels.filter(c=>c.name.toLowerCase().includes(query.toLowerCase()))??[];
 const points=channel?.samples.filter(s=>typeof s.value==='number'&&Number.isFinite(s.value))??[];
 const plot=stats&&points.length&&log?points.filter((_,i)=>i%Math.max(1,Math.ceil(points.length/1000))===0).map(s=>`${10+780*(s.time-log.start)/Math.max(.001,log.end-log.start)},${150-140*((s.value as number)-stats.min)/Math.max(.000001,stats.max-stats.min)}`).join(' '):'';
 return <section className="robot-log" aria-label={pick('Robot log inspection','בדיקת לוג רובוט')}>
  <header><div><h2>{pick('Inspect a robot log','בדיקת לוג רובוט')}</h2><p>{pick('Open → inspect channels → identify the code revision.','פתיחה ← בדיקת ערוצים ← זיהוי גרסת הקוד')}</p></div><label className="hub-button">{pick('Open WPILOG','פתיחת WPILOG')}<input aria-label={pick('Choose WPILOG file','בחירת קובץ WPILOG')} type="file" accept=".wpilog" onChange={e=>{const file=e.target.files?.[0];if(file)void open(file);e.target.value='';}}/></label></header>
  <p>{pick('Local inspection: this file stays on this device. Nothing is uploaded, saved to team history or sent to AI.','בדיקה מקומית: הקובץ נשאר במכשיר. דבר אינו מועלה, נשמר בהיסטוריית הצוות או נשלח לבינה מלאכותית.')}</p>
  {busy&&<p role="status">{pick('Reading log…','קורא לוג…')} <button onClick={()=>{ticket.current++;worker.current?.terminate();setBusy(false);setName('');setHash('');}}>{pick('Cancel','ביטול')}</button></p>}
  {error&&<p role="alert">{error}</p>}
  {log&&<><h3 dir="auto">{name}</h3><p>{log.records.toLocaleString()} {pick('records','רשומות')} · {log.channels.length} {pick('channels','ערוצים')} · {(log.end-log.start).toFixed(2)} {pick('seconds','שניות')}</p>
   <p><strong>{pick('Code revision: not verified','גרסת קוד: לא אומתה')}</strong> — {pick('A filename or project label does not prove which code was running.','שם קובץ או תווית פרויקט אינם מוכיחים איזה קוד פעל.')}</p>
   {!log.complete&&<p role="alert">{pick('Partial log. Do not treat this as a complete run.','לוג חלקי. אין להתייחס אליו כריצה מלאה.')} <code>{log.warnings.join(', ')}</code></p>}
   <p>{log.channels.filter(c=>c.unsupported).length} {pick('channels have unsupported structured data; they are listed but not decoded.','ערוצים מכילים נתונים מובנים שאינם נתמכים; הם מוצגים ברשימה אך אינם מפוענחים.')}</p>
   <label>{pick('Find a signal','חיפוש אות')}<input type="search" value={query} onChange={e=>setQuery(e.target.value)}/></label>
   <div className="robot-log-columns"><div className="robot-log-signals" role="group" aria-label={pick('Channels','ערוצים')}>{visible.map(c=><button key={c.generation} aria-pressed={selected===c.generation} onClick={()=>setSelected(c.generation)}><span dir="ltr">{c.name}</span><small>{c.type} · {c.records}</small></button>)}{!visible.length&&<p>{pick('No matching signals.','לא נמצאו אותות מתאימים.')}</p>}</div>
   <div>{channel?<><h3 dir="ltr">{channel.name}</h3><p>{pick('Time is seconds in the log clock, not date/time. Units are not inferred.','הזמן הוא בשניות לפי שעון הלוג, לא תאריך ושעה. יחידות אינן מוסקות אוטומטית.')}</p>{stats&&<p dir="ltr">Min {stats.min.toPrecision(5)} · Max {stats.max.toPrecision(5)} · {pick('Sample mean','ממוצע דגימות')} {stats.mean.toPrecision(5)}</p>}{plot&&<><svg viewBox="0 0 800 170" role="img" aria-label={pick('Numeric signal overview, sampled to at most 1000 points','סקירת אות מספרי, עד 1000 נקודות')}><polyline fill="none" stroke="currentColor" strokeWidth="2" points={plot}/></svg><small>{pick('Sampled overview; brief peaks may be omitted. Statistics use all decoded finite samples.','סקירה מדוגמת; שיאים קצרים עלולים לא להופיע. הסטטיסטיקה משתמשת בכל הדגימות המספריות התקינות.')}</small></>}
   <details><summary>{pick('Latest 20 samples','20 הדגימות האחרונות')}</summary><table><thead><tr><th>{pick('Time (s)','זמן (שניות)')}</th><th>{pick('Value','ערך')}</th></tr></thead><tbody>{channel.samples.slice(-20).map((s,i)=><tr key={i}><td>{s.time.toFixed(6)}</td><td dir="auto">{JSON.stringify(s.value).slice(0,500)}</td></tr>)}</tbody></table></details><details><summary>{pick('Source metadata','מטא־נתונים מהמקור')}</summary><pre>{channel.metadata||pick('Not provided','לא סופק')}</pre></details></>:<p>{pick('Select a signal to inspect it.','בחרו אות לבדיקה.')}</p>}</div></div>
   <details><summary>{pick('File identity','זהות הקובץ')}</summary><code className="robot-log-hash">SHA-256: {hash}</code></details>
  </>}
 </section>;
}
