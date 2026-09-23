import {useEffect,useState} from 'react';

/** Keep intermediate keyboard text separate from the validated simulation value. */
export default function TwinNumberInput({value,onCommit,min,max,step,disabled,integer=false}:{value:number;onCommit:(value:number)=>void;min:number;max:number;step:number;disabled?:boolean;integer?:boolean}){
 const [draft,setDraft]=useState(String(value));
 useEffect(()=>setDraft(String(value)),[value]);
 const valid=draft.trim()!==''&&Number.isFinite(Number(draft))&&Number(draft)>=min&&Number(draft)<=max&&(!integer||Number.isInteger(Number(draft)));
 const commit=()=>{if(valid)onCommit(Number(draft));else setDraft(String(value));};
 return <input type="number" value={draft} min={min} max={max} step={step} disabled={disabled} aria-invalid={!valid} title={`Enter ${integer?'a whole number':'a number'} from ${min} to ${max}. Apply with Enter or leave the field; invalid entries revert.`} onChange={e=>setDraft(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();e.currentTarget.blur();}else if(e.key==='Escape'){e.preventDefault();setDraft(String(value));}}}/>;
}
