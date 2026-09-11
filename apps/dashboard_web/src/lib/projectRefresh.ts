import {useEffect,useRef} from 'react';
const key='g3-project-change';
export function notifyProjectChange(){
 window.dispatchEvent(new Event('g3-actions-changed'));
 try{localStorage.setItem(key,`${Date.now()}-${Math.random()}`);}catch{/* Local refresh still works when browser storage is unavailable. */}
}
export function useProjectRefresh(refresh:()=>unknown){
 const current=useRef(refresh);current.current=refresh;
 useEffect(()=>{
  let timer:ReturnType<typeof setTimeout>|undefined;
  const run=()=>{if(document.visibilityState==='hidden')return;clearTimeout(timer);timer=setTimeout(()=>{void current.current();},100);};
  const storage=(e:StorageEvent)=>{if(e.key===key)run();};
  window.addEventListener('g3-actions-changed',run);window.addEventListener('focus',run);window.addEventListener('storage',storage);document.addEventListener('visibilitychange',run);
  return()=>{clearTimeout(timer);window.removeEventListener('g3-actions-changed',run);window.removeEventListener('focus',run);window.removeEventListener('storage',storage);document.removeEventListener('visibilitychange',run);};
 },[]);
}
