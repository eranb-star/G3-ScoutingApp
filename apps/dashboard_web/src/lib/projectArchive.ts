export function projectInView(project:{id:string;status:string},tasks:{project_id:string;archived?:boolean}[],archive:boolean){
  return archive ? project.status==='archived'||tasks.some(t=>t.project_id===project.id&&t.archived) : project.status!=='archived';
}
export function taskInView(project:{status:string},task:{archived?:boolean},archive:boolean){
  return archive ? project.status==='archived'||task.archived : !task.archived;
}
