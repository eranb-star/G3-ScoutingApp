import {useEffect,useRef} from 'react';
import {useLocalization} from '../lib/localization';

/** Native dialog supplies focus trapping, inert background and keyboard focus restoration. */
export default function BuildLeaveDialog({resolve}:{resolve:(discard:boolean)=>void}){
 const {pick}=useLocalization();
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{ref.current?.showModal();},[]);
 return <dialog ref={ref} className="build-leave-dialog" aria-labelledby="build-leave-title" onCancel={e=>{e.preventDefault();resolve(false);}}>
  <h2 id="build-leave-title">{pick('Keep your unfinished changes?','לשמור על השינויים שטרם הושלמו?')}</h2>
  <p>{pick('Stay to finish and save this form. Leaving discards unsubmitted values; it does not undo records already saved on the server.','הישארו כדי להשלים ולשמור את הטופס. עזיבה מבטלת ערכים שלא נשלחו; היא אינה מבטלת רשומות שכבר נשמרו בשרת.')}</p>
  <div className="build-work-actions"><button autoFocus onClick={()=>resolve(false)}>{pick('Stay and finish','הישארות והשלמה')}</button><button onClick={()=>resolve(true)}>{pick('Discard and leave','ביטול השינויים ועזיבה')}</button></div>
 </dialog>;
}
