// Deterministic extraction only. No model calls, OCR, PDF scripts or external assets.
export const EXTRACTOR_VERSION = 'official-text-v1';
export const MAX_TEXT = 1500000;
export function textChunks(text, locator) {
  const clean = text.replace(/\u0000/g, '').replace(/[ \t]+/g, ' ').trim();
  const rows=[];
  for(let start=0;start<clean.length;){
    let end=Math.min(start+2800,clean.length);
    if(end<clean.length){const boundary=clean.lastIndexOf(' ',end);if(boundary>start+1800)end=boundary;}
    const body=clean.slice(start,end).trim();if(body.length>=20)rows.push({body,locator});
    start=end;
  }
  return rows;
}
export async function extractPdf(data, getDocumentProxy, {startPage=1,pageCount=250}={}) {
  const pdf=await getDocumentProxy(data,{isEvalSupported:false,disableFontFace:true,useSystemFonts:false,stopAtErrors:true});
  try {
    if(pdf.numPages>250)throw Error('PDF exceeds 250 pages. Split/import a supported document; no partial index was published.');
    let total=0,empty=0;const chunks=[];
    const lastPage=Math.min(pdf.numPages,startPage+pageCount-1);
    for(let page=startPage;page<=lastPage;page++){
      const p=await pdf.getPage(page),content=await p.getTextContent();
      const text=content.items.map(i=>('str' in i)?i.str+(i.hasEOL?'\n':' '):'').join('');
      total+=text.length;if(total>MAX_TEXT)throw Error('Extracted text exceeds the document limit; no partial index was published.');
      if(text.trim().length<20)empty++;
      chunks.push(...textChunks(text,{page}));p.cleanup();
    }
    if(startPage===1&&lastPage===pdf.numPages&&(!chunks.length||empty>Math.max(3,pdf.numPages*.3)))throw Error('PDF has insufficient extractable text. Scanned/image pages need OCR or manual review; no partial index was published.');
    return {chunks,pages:pdf.numPages,emptyPages:empty,format:'pdf',nextPage:lastPage+1,characters:total};
  } finally {await pdf.destroy();}
}
function plain(html){return html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'').replace(/<!--[\s\S]*?-->/g,'').replace(/<\/(?:p|h[1-6]|tr|div|li)>/gi,'\n').replace(/<\/(?:td|th)>/gi,' | ').replace(/<[^>]+>/g,' ').replace(/&#x([0-9a-f]+);/gi,(_,n)=>{const c=parseInt(n,16);return c<=1114111?String.fromCodePoint(c):'';}).replace(/&#(\d+);/g,(_,n)=>Number(n)<=1114111?String.fromCodePoint(Number(n)):'').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&quot;/gi,'"');}
export function extractHtml(data){
  const prefix=new TextDecoder().decode(data.slice(0,2048));
  const charset=prefix.match(/charset\s*=\s*["']?([a-z0-9_-]+)/i)?.[1]?.toLowerCase()??'utf-8';
  const html=new TextDecoder(['macintosh','windows-1252','utf-8'].includes(charset)?charset:'utf-8').decode(data).replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'').replace(/<!--[\s\S]*?-->/g,'');
  if(!/<html\b|<!doctype html/i.test(html))throw Error('Publisher did not return a valid HTML document.');
  const headings=[...html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)];
  if(headings.length<2)throw Error('HTML has no usable document sections. It may be an error page; not indexed.');
  let total=0;const chunks=[];
  headings.forEach((h,i)=>{const title=plain(h[2]).trim(),body=plain(html.slice(h.index,headings[i+1]?.index??html.length));total+=body.length;const anchor=[...h[0].matchAll(/(?:name|id)=["']([^"']+)["']/gi)][0]?.[1];chunks.push(...textChunks(body,{section:title.slice(0,180),...(anchor?{anchor}: {})}));});
  if(total>MAX_TEXT||total<200)throw Error('HTML text is outside the supported size bounds.');
  return {chunks,pages:0,emptyPages:0,format:'html'};
}
export async function fingerprint(data){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data)),b=>b.toString(16).padStart(2,'0')).join('');}
