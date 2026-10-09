export type BuildProject = {id:string;name:string;status:string;subteam:string|null;due_at:string|null};
export type BuildView = 'overview'|'parts'|'work'|'assembly'|'details';
export function buildView(value:string|null):BuildView {
 return value==='parts'||value==='work'||value==='assembly'||value==='details'?value:'overview';
}
export function selectBuild(projects:BuildProject[],buildIds:Set<string>,requested:string|null):BuildProject|null {
 if(requested)return projects.find(p=>p.id===requested)??null;
 const active=projects.filter(p=>buildIds.has(p.id)&&!['archived','completed'].includes(p.status));
 return active.length===1?active[0]:null;
}
/** Always terminate on overflow rather than present a truncated list as complete. */
export async function readBuildPages<T>(fetchPage:(start:number,end:number)=>PromiseLike<{data:T[]|null;error:unknown}>,size=500,maxPages=200):Promise<T[]> {
 const rows:T[]=[];
 for(let page=0;page<maxPages;page++){
  const result=await fetchPage(page*size,(page+1)*size-1);
  if(result.error)throw result.error;
  if(!result.data)throw new Error('Missing page');
  rows.push(...result.data);
  if(result.data.length<size)return rows;
 }
 throw new Error('Build list exceeds supported size');
}
