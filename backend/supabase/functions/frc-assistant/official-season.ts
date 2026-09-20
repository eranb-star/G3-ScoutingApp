import type {Evidence} from './evidence-context.ts';

// Reviewed publisher registry. Never fetch a URL supplied by a question or source.
const manuals:Record<number,string>={2026:'https://firstfrc.blob.core.windows.net/frc2026/Manual/HTML/2026GameManual.htm'};
const cache=new Map<number,{expires:number;html:string;version:string}>();
export function seasonForQuestion(question:string,now=new Date()):number|null {
 const explicit=question.match(/\b(20\d{2})\b/);
 if(explicit && /frc|season|challenge|game|rule|strateg|climb|scor|ranking|עונה|משחק|טיפוס/i.test(question))return Number(explicit[1]);
 return /(?:this|current)\s+(?:season|year|game)|העונה|השנה/i.test(question)?now.getUTCFullYear():null;
}
function plain(html:string){return html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'').replace(/<!--[\s\S]*?-->/g,'').replace(/<\/(?:p|h[1-6]|tr|div)>/gi,'\n').replace(/<\/(?:td|th)>/gi,' | ').replace(/<[^>]+>/g,'').replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&#(\d+);/g,(_,n)=>Number(n)<=1114111?String.fromCodePoint(Number(n)):'').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&quot;/gi,'"').replace(/[ \t\r\n]+/g,' ').trim();}
export function manualSections(html:string){
 const headings=[...html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)];
 return headings.map((m,i)=>({title:plain(m[2]),anchor:[...m[2].matchAll(/(?:name|id)=["']([^"']+)["']/gi)].find(a=>a[1].startsWith('_Toc'))?.[1],body:plain(html.slice(m.index!+m[0].length,headings[i+1]?.index??html.length))})).filter(s=>s.body.length>40);
}
export function selectManualEvidence(html:string,year:number,question:string,version:string):Evidence[]{
 const sections=manualSections(html),words=question.toLowerCase().match(/[a-z]{3,}/g)??[];
 const strategy=/strateg|climb|scor|ranking|טיפוס|אסטרטג/i.test(question);
 const scored=sections.map((s,index)=>({s,index,score:(strategy&&/^6\.5\b/.test(s.title)?100:0)+(strategy&&/^5\.8\b/.test(s.title)?60:0)+words.reduce((n,w)=>n+(s.title.toLowerCase().includes(w)?10:0)+(s.body.toLowerCase().includes(w)?1:0),0)})).filter(s=>s.score>0).sort((a,b)=>b.score-a.score||a.index-b.index);
 let remaining=14500;
 return scored.slice(0,6).flatMap(({s,index})=>{if(remaining<300)return [];const body=s.body.slice(0,Math.min(6000,remaining));remaining-=body.length;return [{id:9000000000000+year*1000+index,url:manuals[year]+(s.anchor?'#'+s.anchor:''),title:`${year} official FRC manual — ${s.title}`,body,version,seasons:[year],scope:body.length<s.body.length?'Section excerpt (truncated); consult full linked section':'Official section text; tables flattened into rows',source_class:'official'}];});
}
export async function officialSeasonEvidence(question:string,dependencies:{fetch?:typeof fetch;now?:()=>number}={}){
 const now=dependencies.now??Date.now,year=seasonForQuestion(question,new Date(now()));
 if(year===null)return {year,rows:[] as Evidence[],status:'not_requested'};
 if(!manuals[year])return {year,rows:[] as Evidence[],status:'not_configured'};
 try{
  let entry=cache.get(year);
  if(!entry||entry.expires<=now()){
   const response=await (dependencies.fetch??fetch)(manuals[year],{redirect:'error',signal:AbortSignal.timeout(8000)});
   if(!response.ok||!response.headers.get('content-type')?.includes('text/html'))throw Error('MANUAL_FETCH_FAILED');
   const reader=response.body?.getReader();if(!reader)throw Error('EMPTY_MANUAL');
   const chunks:Uint8Array[]=[];let size=0;
   while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>3000000){await reader.cancel();throw Error('MANUAL_TOO_LARGE');}chunks.push(value);}
   const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
   const prefix=new TextDecoder().decode(bytes.slice(0,2048));
   const charset=prefix.match(/charset\s*=\s*[\"']?([a-z0-9_-]+)/i)?.[1]?.toLowerCase()??'utf-8';
   const html=new TextDecoder(['macintosh','windows-1252','utf-8'].includes(charset)?charset:'utf-8').decode(bytes);
   if(!plain(html.slice(0,180000)).includes(String(year))||manualSections(html).length<20)throw Error('INVALID_MANUAL');
   const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
   entry={html,version:`sha256:${hash}; fetched ${new Date(now()).toISOString()}`,expires:now()+15*60*1000};cache.set(year,entry);
  }
  const rows=selectManualEvidence(entry.html,year,question,entry.version);
  return {year,rows,status:rows.length?'retrieved':'no_relevant_sections'};
 }catch{return {year,rows:[] as Evidence[],status:'retrieval_failed'};}
}
