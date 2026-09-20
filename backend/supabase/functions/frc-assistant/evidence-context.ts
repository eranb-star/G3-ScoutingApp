export type Evidence={id:number;url:string;title:string;body:string;version:string;seasons:number[];scope?:string;source_class:string};
export function retrievalQuery(question:string){
 const stop=new Set('how can could would should do does did i we our my the a an to for with and or is are was were of in on it this that what why help please robot robots'.split(' '));
 return [...new Set(question.toLowerCase().match(/[\p{L}\p{N}_-]+/gu)??[])].filter(w=>w.length>2&&!stop.has(w)).slice(0,12).map(w=>'"'+w+'"').join(' OR ').slice(0,200);
}
export async function retrieveEvidence(caller:any,question:string,selected?:{generation:string;ids:number[]}){
 if(selected){
  if(typeof selected.generation!=='string'||!selected.generation||!Array.isArray(selected.ids)||selected.ids.length<1||selected.ids.length>6||selected.ids.some(id=>!Number.isInteger(id)||id<1)||selected.generation.length>100)throw new Error('INVALID_EVIDENCE');
  const {data,error}=await caller.rpc('resolve_frc_corpus',{p_generation:selected.generation,p_ids:selected.ids});
  if(error||data?.length!==new Set(selected.ids).size)throw new Error('EVIDENCE_UNAVAILABLE');
  return data as Evidence[];
 }
 const query=retrievalQuery(question);if(!query)return [];
 const {data,error}=await caller.rpc('search_frc_corpus',{p_query:query});
 if(error)return [];
 const ids=data.rows.slice(0,6).map((r:Evidence)=>r.id);if(!ids.length)return [];
 const resolved=await caller.rpc('resolve_frc_corpus',{p_generation:data.generation,p_ids:ids});
 if(resolved.error)return [];
 return resolved.data as Evidence[];
}
export function evidencePrompt(rows:Evidence[]){return rows.map(r=>`[S${r.id}] ${r.title}\nAuthority: ${r.source_class}; season context: ${r.seasons.join(', ')||'unspecified'}; revision: ${r.version}; scope: ${r.scope||'unspecified'}. ${r.source_class==="official"?"Official publisher text; interpret only within this season and revision.":"Unreviewed source text; not a verified robot fact."}\n${r.body}`).join('\n\n').slice(0,18000);}
export function validatedCitations(answer:string,rows:Evidence[]){
 const ids=[...answer.matchAll(/\[S(\d+)\]/g)].map(m=>Number(m[1]));
 const allowed=new Map(rows.map(r=>[r.id,r]));
 if(ids.some(id=>!allowed.has(id)))throw new Error('UNSUPPORTED_CITATION');
 return [...new Set(ids)].map(id=>({id:'S'+id,url:allowed.get(id)!.url,title:allowed.get(id)!.title,version:allowed.get(id)!.version}));
}
