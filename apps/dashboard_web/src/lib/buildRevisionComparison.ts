export type RevisionPart={id:string;name:string;design_quantity:number;job_id:string|null;source_identity?:Record<string,unknown>};
export type RevisionChange={kind:'added'|'removed'|'changed'|'unchanged'|'ambiguous';before:RevisionPart[];after:RevisionPart[];fields:string[]};
/** Match provider identity, never a display name or revision-dependent row key. */
function identity(row:RevisionPart):string|null {
 const s=row.source_identity;
 if(!s||s.kind==='manual'||![s.documentId,s.elementId,s.partId].every(v=>typeof v==='string'&&v.length>0))return null;
 return JSON.stringify([s.documentId,s.elementId,s.partId,s.configuration??'']);
}
function value(row:RevisionPart,field:string):unknown {
 if(field==='quantity')return row.design_quantity;
 if(field==='name')return row.name;
 if(field==='microversion')return row.source_identity?.microversion??null;
 const m=row.source_identity?.metadata as Record<string,unknown>|undefined;
 return m?.[field]??null;
}
export function compareBuildRevisions(before:RevisionPart[],after:RevisionPart[]):RevisionChange[]{
 const groups=new Map<string,{before:RevisionPart[];after:RevisionPart[]}>();
 for(const [side,rows] of [['before',before],['after',after]] as const)for(const row of rows){
  // Unknown identities are not guessed to match, even with identical names.
  const key=identity(row)??`${side}:${row.id}`;
  const group=groups.get(key)??{before:[],after:[]};group[side].push(row);groups.set(key,group);
 }
 return [...groups.values()].map(group=>{
  if(group.before.length>1||group.after.length>1)return {...group,kind:'ambiguous',fields:[]};
  if(!group.before.length)return {...group,kind:'added',fields:[]};
  if(!group.after.length)return {...group,kind:'removed',fields:[]};
  const fields=['quantity','name','microversion','status','partNumber','material','vendor','revision'].filter(f=>value(group.before[0],f)!==value(group.after[0],f));
  return {...group,kind:fields.length?'changed':'unchanged',fields};
 });
}
