// All provider credentials stay in the Edge Function. Never return these envelopes to clients.
export class CadError extends Error {
  constructor(public code: string, message: string, public status = 400) { super(message); }
}
const idPattern = /^[a-f0-9]{24}$/i;
export function onshapeId(value: unknown): string {
  if (typeof value !== 'string' || !idPattern.test(value)) throw new CadError('INVALID_SOURCE', 'Use a valid Onshape document link.');
  return value.toLowerCase();
}
export function parseSource(value: unknown) {
  let url: URL;
  try { url = new URL(String(value)); } catch { throw new CadError('INVALID_SOURCE', 'Use a valid Onshape document link.'); }
  if (url.origin !== 'https://cad.onshape.com' || url.username || url.password) throw new CadError('INVALID_SOURCE', 'Only cad.onshape.com document links are supported.');
  const match = /^\/documents\/([a-f0-9]{24})\/(w|v|m)\/([a-f0-9]{24})\/e\/([a-f0-9]{24})\/?$/i.exec(url.pathname);
  if (!match) throw new CadError('INVALID_SOURCE', 'Open the design tab in Onshape and copy its complete link.');
  const configuration = url.searchParams.get('configuration') || 'default';
  if (configuration.length > 2048) throw new CadError('INVALID_SOURCE', 'Configuration is too long.');
  return {documentId: onshapeId(match[1]), referenceType: match[2].toLowerCase(), referenceId: onshapeId(match[3]), elementId: onshapeId(match[4]), configuration};
}
export async function sha256(value: string) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), b => b.toString(16).padStart(2, '0')).join('');
}
function encode(bytes: Uint8Array) { return btoa(String.fromCharCode(...bytes)); }
function decode(value: string) { return Uint8Array.from(atob(value), c => c.charCodeAt(0)); }
async function key(secret: string) {
  let bytes: Uint8Array;
  try { bytes = decode(secret); } catch { throw new CadError('SETUP_REQUIRED', 'CAD connection encryption is not configured.', 503); }
  if (bytes.length !== 32) throw new CadError('SETUP_REQUIRED', 'CAD connection encryption is not configured.', 503);
  return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
export async function seal(value: unknown, secret: string, connectionId: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({name:'AES-GCM', iv, additionalData:new TextEncoder().encode(connectionId)}, await key(secret), new TextEncoder().encode(JSON.stringify(value)));
  return {v:1, iv:encode(iv), ciphertext:encode(new Uint8Array(ciphertext))};
}
export async function unseal(envelope: any, secret: string, connectionId: string) {
  if (envelope?.v !== 1) throw new CadError('RECONNECT_REQUIRED', 'Reconnect Onshape.', 409);
  const plaintext = await crypto.subtle.decrypt({name:'AES-GCM', iv:decode(envelope.iv), additionalData:new TextEncoder().encode(connectionId)}, await key(secret), decode(envelope.ciphertext));
  return JSON.parse(new TextDecoder().decode(plaintext));
}
export async function boundedJson(response: Response, limit = 4_000_000) {
  if (!response.ok) {
    await response.body?.cancel();
    throw new CadError(response.status === 401 ? 'RECONNECT_REQUIRED' : response.status === 429 ? 'RATE_LIMITED' : 'SOURCE_UNAVAILABLE', response.status === 401 ? 'Reconnect Onshape to continue.' : response.status === 429 ? 'Onshape API limit reached. Try again later.' : 'Onshape could not provide this design. Check access and retry.', response.status === 429 ? 429 : 502);
  }
  if (Number(response.headers.get('content-length')) > limit) { await response.body?.cancel(); throw new CadError('SOURCE_TOO_LARGE', 'This response exceeds the CAD review limit.', 413); }
  const reader = response.body?.getReader();
  if (!reader) throw new CadError('SOURCE_UNAVAILABLE', 'Empty Onshape response.', 502);
  const chunks: Uint8Array[] = []; let length = 0;
  try {
    while (true) { const {done,value} = await reader.read(); if (done) break; length += value.length; if (length > limit) { await reader.cancel(); throw new CadError('SOURCE_TOO_LARGE', 'This response exceeds the CAD review limit.', 413); } chunks.push(value); }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new CadError('SOURCE_UNAVAILABLE', 'Unexpected Onshape response.', 502); }
}
export function providerReader(token: string, fetcher: typeof fetch = fetch) {
  return async (path: string) => {
    // No arbitrary hosts, browser URLs, redirects, or mutations through this reader.
    if (!/^\/(documents|partstudios|assemblies|parts)(\/|\?)/.test(path) || /[\\\r\n#]/.test(path) || path.includes('..')) throw new CadError('INVALID_ENDPOINT', 'Unsupported CAD request.');
    return boundedJson(await fetcher(`https://cad.onshape.com/api${path}`, {method:'GET', headers:{Authorization:`Bearer ${token}`, Accept:'application/json'}, redirect:'error', signal:AbortSignal.timeout(20000)}));
  };
}
// Onshape's unversioned FeatureScript endpoints use typed {type,typeName,message}
// envelopes. Normalize those without discarding the underlying evidence.
export function cadValue(value:any):any {
 if(Array.isArray(value))return value.map(cadValue);
 if(!value||typeof value!=='object')return value;
 if(value.message&&typeof value.message==='object'&&('typeName' in value||typeof value.type==='number'))return cadValue(value.message);
 return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,cadValue(item)]));
}
