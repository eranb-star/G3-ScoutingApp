import {useEffect,useState,type FormEvent} from 'react';
import {supabase} from '../supabase';
import {useLocalization} from '../lib/localization';
import {nextServiceDate,type ServiceSchedule} from '../lib/operationsPlanning';
export default function ComponentServiceSchedule({item,onSaved}:{item:ServiceSchedule&{id:string;service_owner_id?:string|null};onSaved:()=>void}){
 const {pick}=useLocalization();
 const [interval,setInterval]=useState(String(item.service_interval_days??'')),[first,setFirst]=useState(item.first_service_due??''),[owner,setOwner]=useState(item.service_owner_id??'');
 const [members,setMembers]=useState<{id:string;display_name:string}[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{void supabase.from('team_members').select('id,display_name').eq('active',true).order('display_name').then(r=>{if(r.error)setError(r.error.message);else setMembers(r.data??[]);});},[]);
 async function save(e:FormEvent){e.preventDefault();setBusy(true);const r=await supabase.from('robot_components').update({service_interval_days:interval?Number(interval):null,first_service_due:first||null,service_owner_id:owner||null}).eq('id',item.id).select('id').single();setBusy(false);setError(r.error?.message??pick('Service schedule saved.','לוח השירות נשמר.'));if(!r.error)onSaved();}
 const next=nextServiceDate(item);
 return <form className="hub-card operations-planning-form" onSubmit={save}><h3>{pick('Service schedule','תכנון שירות')}</h3><p>{next?pick('Next service: ','השירות הבא: ')+new Date(next).toLocaleDateString():pick('No due date configured. Set the first service date.','לא הוגדר מועד. הגדירו תאריך לשירות הראשון.')}</p><label>{pick('Responsible member','אחראי')}<select value={owner} onChange={e=>setOwner(e.target.value)}><option value="">{pick('Unassigned','ללא אחראי')}</option>{members.map(m=><option key={m.id} value={m.id}>{m.display_name}</option>)}</select></label><label>{pick('Repeat every (days)','חזרה כל (ימים)')}<input type="number" min="1" step="1" value={interval} onChange={e=>setInterval(e.target.value)}/></label><label>{pick('First service due','מועד השירות הראשון')}<input type="date" value={first} onChange={e=>setFirst(e.target.value)}/></label><small>{pick('After a recorded service, the interval determines the next due date. Inspections do not reset it.','לאחר תיעוד שירות, המרווח קובע את המועד הבא. בדיקה בלבד אינה מאפסת את המועד.')}</small>{error?<p role="status">{error}</p>:null}<button className="hub-button" disabled={busy}>{pick('Save schedule','שמירת התכנון')}</button></form>;
}
