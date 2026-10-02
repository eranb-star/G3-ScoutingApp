/** Account-scoped, tab-local recovery. Never put answers in navigation URLs. */
export function draftKey(member:string,course:string){return `g3-learning-draft-v1:${member}:${course}`;}
export function readRecovery<T>(key:string):{value:T;updatedAt:string}|undefined{try{return JSON.parse(sessionStorage.getItem(key)??'null')??undefined;}catch{return undefined;}}
export function writeRecovery(key:string,value:unknown){try{sessionStorage.setItem(key,JSON.stringify({value,updatedAt:new Date().toISOString()}));return true;}catch{return false;}}
export function clearRecovery(key:string){try{sessionStorage.removeItem(key);}catch{/* Cloud save succeeded; storage may be unavailable. */}}
