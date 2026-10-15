/** Only the exact microversion's provider date is accepted. */
export function sourceRevisionDate(history:unknown,microversion:string):string|null{
 if(!Array.isArray(history))return null;
 const row=history.find(r=>r&&typeof r==='object'&&r.microversionId===microversion);
 if(!row||!(typeof row.date==='string'||typeof row.date==='number'))return null;
 const value=new Date(row.date);
 return Number.isFinite(value.getTime())?value.toISOString():null;
}
