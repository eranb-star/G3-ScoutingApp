import {useEffect,useState} from 'react';
/** Preserve intermediate typing while reflecting undo, selection and gizmo changes. */
export default function StudioNumberInput({value,onChange}:{value:number;onChange:(value:number)=>void}){
 const [text,setText]=useState(String(Number(value.toFixed(5))));
 useEffect(()=>setText(String(Number(value.toFixed(5)))),[value]);
 return <input type="number" step="any" required value={text} onChange={event=>{const next=event.target.value;setText(next);if(next.trim()&&Number.isFinite(Number(next)))onChange(Number(next));}} onBlur={()=>{if(!text.trim()||!Number.isFinite(Number(text)))setText(String(Number(value.toFixed(5))));}}/>;
}
