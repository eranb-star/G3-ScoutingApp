export function partOccurrenceIds(paths:unknown,partId?:string):string[]{
 if(Array.isArray(paths)&&paths.length){
  return [...new Set(paths.filter((p):p is string[]=>Array.isArray(p)&&p.length>0&&p.every(s=>typeof s==='string'&&s.length>0&&!s.includes('/'))).map(p=>p.join('/')))];
 }
 return partId?[partId]:[];
}
