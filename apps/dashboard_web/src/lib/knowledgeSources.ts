import {supabase} from '../supabase';
export type KnowledgeSeason={season:number;name:string};
export type SourceWatch={id:string;season:number;title:string;url:string;enabled:boolean};
export type SourceCheck={id:string;season:number;status:'running'|'complete'|'attention'|'cancelled';started_at:string;finished_at:string|null};
export type CheckItem={id:string;url:string;title:string;kind:'listing'|'document';status:'pending'|'new'|'updated'|'unchanged'|'checked'|'failed'|'skipped';note:string};
export type DiscoveredDocument={id:string;season:number;url:string;title:string;sha256:string;bytes:number;checked_at:string;changed_at:string};
export async function readAllEvidence<T>(table:string){
 const rows:T[]=[];for(let start=0;;start+=500){const {data,error}=await supabase.from(table).select('*').order('id').range(start,start+499);if(error)throw error;rows.push(...(data??[]) as T[]);if(!data||data.length<500)return rows;}
}
export function checkSummary(items:CheckItem[]){
 const docs=items.filter(item=>item.kind==='document');return{total:items.length,done:items.filter(i=>i.status!=='pending').length,new:docs.filter(i=>i.status==='new').length,updated:docs.filter(i=>i.status==='updated').length,unchanged:docs.filter(i=>i.status==='unchanged').length,attention:items.filter(i=>i.status==='failed'||i.status==='skipped').length};
}
export async function invokeSourceCheck(action:'start'|'advance'|'retry',args:{season?:number;checkId?:string}){
 const {data,error}=await supabase.functions.invoke('knowledge-source-check',{body:{action,...args}});
 if(error||data?.error)throw new Error(data?.error||'Source check unavailable. Your saved progress is retained.');return data as {checkId?:string;status?:string};
}
