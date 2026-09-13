export type EvidenceSource={id:string;title:string;season:number;authority:string;url:string;revision:string;sha256:string|null;checked_at:string;current:boolean};
export type EvidenceClaim={id:string;source_id:string;title:string;body:string;locator:string;claim_kind:string;status:string;revision:number};
export function findEvidence(claims:EvidenceClaim[],sources:EvidenceSource[],season:number,query:string){
 const words=query.toLowerCase().trim().split(/\s+/).filter(Boolean);
 const allowed=new Set(sources.filter(s=>s.current&&s.season===season).map(s=>s.id));
 return claims.filter(c=>c.status==='published'&&allowed.has(c.source_id)&&words.every(w=>`${c.title} ${c.body}`.toLowerCase().includes(w)));
}
