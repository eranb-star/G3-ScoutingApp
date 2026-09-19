import {useEffect,useRef,useState} from 'react';
import {freshProfile,getPads,loadPadProfile,padKey,savePadProfile,type Pad,type PadProfile} from './twinGamepad';

export function useTwinGamepad(active:boolean){
 const [pads,setPads]=useState<Pad[]>([]),[selection,setSelection]=useState<{index:number;key:string}|null>(null),[profile,setProfile]=useState(freshProfile),[notice,setNotice]=useState('');
 const selected=useRef(selection);selected.current=selection;
 function choose(pad:Pad){const key=padKey(pad);selected.current={index:pad.index,key};setSelection(selected.current);setProfile(loadPadProfile(key));setNotice('');}
 useEffect(()=>{if(!active)return;const poll=()=>{const found=getPads();setPads(found.map(p=>({...p,id:p.id,index:p.index,mapping:p.mapping,connected:p.connected,axes:[...p.axes],buttons:p.buttons.map(b=>({pressed:b.pressed,touched:b.touched,value:b.value}))})));if(!selected.current&&found[0])choose(found[0]);};poll();const timer=setInterval(poll,100);return()=>clearInterval(timer);},[active]);
 function update(next:PadProfile){setProfile(next);if(selection){try{savePadProfile(selection.key,next);setNotice('Controller profile saved on this browser.');}catch{setNotice('Settings work for this session; browser storage is unavailable.');}}}
 const pad=pads.find(p=>p.index===selection?.index&&padKey(p)===selection.key)??null;
 return {pads,pad,selection,profile,choose,update,notice,setNotice};
}
