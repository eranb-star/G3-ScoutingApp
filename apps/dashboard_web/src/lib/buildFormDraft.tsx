import {createContext,useContext,useEffect,useRef,useState} from 'react';
import {useMemberAuth} from './memberAuth';
import {BuildDraftRegistry} from './buildDraftRegistry';

export const BuildDraftContext = createContext<BuildDraftRegistry|null>(null);

export function useBuildStringDraft<T extends Record<string,string>>(scope:string,initial:()=>T,baseline?:string|number){
 return useBuildFormDraft(scope,initial,(v):v is T=>!!v&&typeof v==='object'&&Object.keys(initial()).every(k=>typeof (v as Record<string,unknown>)[k]==='string'&&((v as Record<string,string>)[k].length<=16000)),baseline);
}

/** Explicit React state, scoped to member and record; never restore files or replay writes. */
export function useBuildFormDraft<T>(scope:string, initial:()=>T, valid:(value:unknown)=>value is T,baseline?:string|number) {
 const {profile}=useMemberAuth(), registry=useContext(BuildDraftContext);
 const key=`g3-build-form:${profile?.id??'signed-out'}:${scope}`;
 const initialRef=useRef(initial); initialRef.current=initial;
 const [state,setState]=useState<{key:string;value:T}>(()=>({key,value:initial()}));
 const [storageError,setStorageError]=useState(false),[restored,setRestored]=useState(false);
 const current=useRef(state);current.current=state;
 const dirty=useRef(false);
 const activeKey=useRef<string|null>(key);activeKey.current=key;
 const discard=()=>{try{sessionStorage.removeItem(key);}catch{}dirty.current=false;setRestored(false);setState({key,value:initialRef.current()});};
 const discardRef=useRef(discard);discardRef.current=discard;
 // Registry callbacks may outlive a mounted form. Always clear their original key,
 // and never reset a different record after the component changes scope.
 const discardRegistered=()=>{try{sessionStorage.removeItem(key);}catch{}if(activeKey.current===key)discardRef.current();};
 useEffect(()=>{activeKey.current=key;return()=>{if(activeKey.current===key)activeKey.current=null;};},[key]);
 useEffect(()=>{
  let value=initialRef.current();let found=false;
  try { const raw=sessionStorage.getItem(key);if(raw){const parsed:unknown=JSON.parse(raw);if(valid(parsed)){value=parsed;found=true;}else sessionStorage.removeItem(key);} }
  catch {setStorageError(true);}
  dirty.current=found;setState({key,value});setRestored(found);
  if(found)registry?.mark(key,discardRegistered);
 },[key]);
 useEffect(()=>{if(!dirty.current)setState({key,value:initialRef.current()});},[key,baseline]);
 function change(patch:Partial<T>){
  const value={...(current.current.key===key?current.current.value:initialRef.current()),...patch};
  dirty.current=true;current.current={key,value};setState(current.current);registry?.mark(key,discardRegistered);
  try{sessionStorage.setItem(key,JSON.stringify(value));setStorageError(false);}catch{setStorageError(true);}
 }
 function saved(next:T){
  dirty.current=false;registry?.saved(key);try{sessionStorage.removeItem(key);}catch{}
  current.current={key,value:next};setState(current.current);setRestored(false);
 }
 function initialize(value:T){if(!dirty.current){current.current={key,value};setState(current.current);}}
 return {id:key,value:state.key===key?state.value:initialRef.current(),change,saved,initialize,dirty:dirty.current,restored,storageError};
}
