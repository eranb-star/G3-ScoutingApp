export function buildLearningReturn(value:string|null):string|null {
 if(!value||!value.startsWith('/robot-build?'))return null;
 try{const url=new URL(value,'https://g3.invalid');if(url.origin!=='https://g3.invalid'||url.pathname!=='/robot-build')return null;
 const project=url.searchParams.get('project');if(!project||!/^[a-f0-9-]{36}$/i.test(project))return null;
 const result=new URLSearchParams({project,view:'work'});const task=url.searchParams.get('task');if(task&&/^[a-f0-9-]{36}$/i.test(task))result.set('task',task);
 return '/robot-build?'+result;
 }catch{return null;}
}
export function buildLearningStatus(enrollment:string|undefined,official:string|undefined){
 return official==='verified'||enrollment==='qualified'?'completed':official==='submitted'||enrollment==='submitted'?'pending':enrollment==='in_progress'?'in_progress':enrollment==='assigned'?'assigned':'unassigned';
}
