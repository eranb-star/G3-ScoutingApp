// Pure, bounded FIRST discovery adapter. Source bytes are transient, never rehosted.
export const MAX_DOCUMENTS = 80;
export const MAX_PDF_BYTES = 24 * 1024 * 1024;
export const MAX_CHECK_BYTES = 128 * 1024 * 1024;
const hosts = new Set(['www.firstinspires.org', 'firstfrc.blob.core.windows.net']);
export function safeSourceUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !hosts.has(url.hostname)) throw new Error('Source address is not an approved official host.');
  if (url.hostname === 'www.firstinspires.org' && !url.pathname.startsWith('/resources/library/frc/')) throw new Error('Source is outside the approved FRC library.');
  if (url.hostname === 'firstfrc.blob.core.windows.net' && !/^\/frc\d{4}\//i.test(url.pathname)) throw new Error('Source is outside a season document collection.');
  url.hash = '';return url.href;
}
function plain(value) {
  return value.replace(/<[^>]*>/g, ' ').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&nbsp;/gi, ' ').replace(/&#(\d+);/g, (_, n) => Number(n) <= 0x10ffff ? String.fromCodePoint(Number(n)) : '').replace(/\s+/g, ' ').trim();
}
export function discoverDocuments(html, base, season) {
  const documents = new Map();let ignored = 0;
  // Exclude scripts/comments so quoted template content cannot invent a publication.
  const body = html.replace(/<!--[\s\S]*?-->|<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
  for (const match of body.matchAll(/<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi)) {
    try {
      const url = safeSourceUrl(new URL(plain(match[2]), base).href);
      if (!new RegExp(`^/frc${season}/`, 'i').test(new URL(url).pathname)) continue;
      const title = plain(match[3]).slice(0, 180) || decodeURIComponent(new URL(url).pathname.split('/').pop()).slice(0, 180);
      const supported = /\.pdf$/i.test(new URL(url).pathname);
      if (!documents.has(url)) documents.set(url, {url, title, supported});
    } catch { ignored++; }
  }
  return {documents: [...documents.values()], ignored};
}
export async function fetchBounded(url, maxBytes, fetcher = fetch, onBytes = (_length) => {}, validators = {}) {
  let current = safeSourceUrl(url);
  const controller = new AbortController();const timer = setTimeout(() => controller.abort(), 18000);
  try {
    for (let redirects = 0; redirects <= 3; redirects++) {
      const conditional=redirects>0?{}:validators.etag?{'If-None-Match':validators.etag}:validators.modified?{'If-Modified-Since':validators.modified}:{};
      const response = await fetcher(current, {redirect:'manual',signal:controller.signal,headers:{'User-Agent':'G3-6740-Knowledge/1.0','Accept':'text/html,application/pdf',...conditional}});
      if ([301,302,303,307,308].includes(response.status)) {
        const location = response.headers.get('location');await response.body?.cancel();
        if (!location) throw new Error('Publisher returned a redirect without a destination.');
        current = safeSourceUrl(new URL(location,current).href);continue;
      }
      const etag=response.headers.get('etag'),modified=response.headers.get('last-modified');
      if(response.status===304&&Object.keys(conditional).length)return {data:new Uint8Array(0),url:current,type:'',notModified:true,etag,modified};
      if (!response.ok) {await response.body?.cancel();throw new Error(`Publisher returned HTTP ${response.status}. Try again later.`);}
      if (Number(response.headers.get('content-length')) > maxBytes) {await response.body?.cancel();throw new Error('Document exceeds the download limit. Open the original source.');}
      const reader = response.body?.getReader();if (!reader) throw new Error('Publisher returned an empty response.');
      const chunks=[];let length=0;
      for (;;) {const {done,value}=await reader.read();if(done)break;length+=value.length;onBytes(length);if(length>maxBytes){await reader.cancel();throw new Error('Document exceeds the download limit. Open the original source.');}chunks.push(value);}
      const data=new Uint8Array(length);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.length;}
      return {data,url:current,type:response.headers.get('content-type')??'',notModified:false,etag,modified};
    }
    throw new Error('Publisher redirected too many times.');
  } finally {clearTimeout(timer);}
}
export function assertPdf(data) {
  if (!new TextDecoder().decode(data.slice(0,1024)).includes('%PDF-')) throw new Error('The publisher returned a page instead of a PDF. Open the source and retry later.');
}
