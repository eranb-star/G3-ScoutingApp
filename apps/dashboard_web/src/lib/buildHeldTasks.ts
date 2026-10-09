/** A hold applies to downstream work, even while its historical approval is retained. */
export function buildHeldTasks(holds:{task_id:string}[],dependencies:{task_id:string;prerequisite_id:string}[]):Set<string>{
 const held=new Set(holds.map(h=>h.task_id));
 const children=new Map<string,string[]>();
 for(const d of dependencies)children.set(d.prerequisite_id,[...(children.get(d.prerequisite_id)??[]),d.task_id]);
 const queue=[...held];for(let i=0;i<queue.length;i++)for(const child of children.get(queue[i])??[])if(!held.has(child)){held.add(child);queue.push(child);}
 return held;
}
