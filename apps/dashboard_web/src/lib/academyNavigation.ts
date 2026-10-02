import {useRef} from 'react';
import {useSearchParams} from 'react-router-dom';
export const academyViews=['home','explore','content','catalog','assessments','progress','review','robot-lab','practical','robot-tests'] as const;
export type AcademyView=typeof academyViews[number];
export function useAcademyNavigation(){
 const [params,setParams]=useSearchParams();const pending=useRef<URLSearchParams|null>(null);
 function set(key:string,value:string){const queued=!!pending.current;pending.current??=new URLSearchParams(params);if(value)pending.current.set(key,value);else pending.current.delete(key);if(!queued)queueMicrotask(()=>{const next=pending.current;pending.current=null;if(next)setParams(next);});}
 return {params,view:academyViews.includes(params.get('view') as AcademyView)?params.get('view') as AcademyView:'home',setView:(v:AcademyView)=>set('view',v),course:params.get('course')??'',setCourse:(v:string)=>set('course',v),instructor:params.get('mode')==='instructor'||params.get('view')==='review',setInstructor:(v:boolean)=>set('mode',v?'instructor':''),labCourse:params.get('lesson')??'',setLabCourse:(v:string)=>set('lesson',v),step:params.has('step')?Math.max(0,Math.min(3,Number(params.get('step'))||0)):undefined,setStep:(v:number|undefined)=>set('step',v===undefined?'':String(v)),set};
}
