export type ReviewDraft={revision:string;items:{title:string;revision:string;url:string}[];notes:string;expectedSubmission:string|null};
export function reviewDraftKey(member:string,task:string){return `g3-review-draft:${member}:${task}`;}
export function parseReviewDraft(raw:string|null):ReviewDraft|null{
 try{const d=JSON.parse(raw??'null');if(!d||typeof d.revision!=='string'||typeof d.notes!=='string'||!(d.expectedSubmission===null||typeof d.expectedSubmission==='string')||!Array.isArray(d.items)||d.items.length<1||d.items.length>12||!d.items.every((x:Record<string,unknown>)=>x&&['title','revision','url'].every(k=>typeof x[k]==='string')))return null;return d;}catch{return null;}
}
