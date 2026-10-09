import {createContext,useContext,useEffect,useRef,useState} from 'react';
import {useMemberAuth} from './memberAuth';
import {BuildDraftRegistry} from './buildDraftRegistry';

export const BuildDraftContext = createContext<BuildDraftRegistry|null>(null);

export function useBuildStringDraft<T extends Record<string,string>>(scope:string,initial:()=>T){
 return useBuildFormDraft(scope,initial,(v):v is T=>!!v&&typeof v==='object'&&Object.keys(initial()).every(k=>typeof (v as Record<string,unknown>)[k]==='string'&&((v as Record<string,string>)[k].length<=16000)));
}

/** Explicit React state, scoped to member and record; never restore files or replay writes. */
export function useBuildFormDraft<T>(scope:string, initial:()=>T, valid:(value:unknown)=>value is T) {
 const {profile}=useMemberAuth(), registry=useContext(BuildDraftContext);
 const key=`g3-build-form:${profile?.id??'signed-out'}:${scope}`;
 const initialRef=useRef(initial); initialRef.current=initial;
 const [state,setState]=useState<{key:string;value:T}>(()=>({key,value:initial()}));
 const [storageError,setStorageError]=useState(false),[restored,setRestored]=useState(false);
 const current=useRef(state);current.current=state;
 const discard=()=>{try{sessionStorage.removeItem(key);}catch{}setRestored(false);setState({key,value:initialRef.current()});};
 const discardRef=useRef(discard);discardRef.current=discard;
 useEffect(()=>{
  let value=initialRef.current();let found=false;
  try { const raw=sessionStorage.getItem(key);if(raw){const parsed:unknown=JSON.parse(raw);if(valid(parsed)){value=parsed;found=true;}else sessionStorage.removeItem(key);} }
  catch {setStorageError(true);}
  setState({key,value});setRestored(found);
  if(found)registry?.mark(key,()=>discardRef.current());
 },[key]);
 function change(patch:Partial<T>){
  const value={...(current.current.key===key?current.current.value:initialRef.current()),...patch};
  current.current={key,value};setState(current.current);registry?.mark(key,()=>discardRef.current());
  try{sessionStorage.setItem(key,JSON.stringify(value));setStorageError(false);}catch{setStorageError(true);}
 }
 function saved(next:T){
  registry?.saved(key);try{sessionStorage.removeItem(key);}catch{}
  current.current={key,value:next};setState(current.current);setRestored(false);
 }
 return {id:key,value:state.key===key?state.value:initialRef.current(),change,saved,restored,storageError};
}
