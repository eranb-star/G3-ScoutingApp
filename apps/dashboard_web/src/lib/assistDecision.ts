export type AssistTaskDraft={version:1;member:string;message:string;request:string;title:string};
export const assistDraftKey=(member:string)=>`g3-assist-task:${member}`;
export function parseAssistTaskDraft(raw:string|null,member:string):AssistTaskDraft|null{
 try{const d=JSON.parse(raw??'null');return d?.version===1&&d.member===member&&[d.message,d.request].every(x=>typeof x==='string'&&/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(x))&&typeof d.title==='string'&&d.title.trim().length>0&&d.title.length<=150?d:null;}catch{return null;}
}
export type AnswerBlock={kind:'heading'|'paragraph'|'list'|'table'|'code';lines:string[]};
export function answerBlocks(text:string):AnswerBlock[]{
 const lines=text.replace(/\r/g,'').split('\n'),blocks:AnswerBlock[]=[];
 for(let i=0;i<lines.length;){const line=lines[i].trim();if(!line||/^[-*_]{3,}$/.test(line)){i++;continue;}
 if(/^```/.test(line)){const rows:string[]=[];i++;while(i<lines.length&&!/^```/.test(lines[i].trim()))rows.push(lines[i++]);if(i<lines.length)i++;blocks.push({kind:'code',lines:rows});continue;}
 if(/^#{1,6}\s/.test(line)){blocks.push({kind:'heading',lines:[line.replace(/^#{1,6}\s+/,'')]});i++;continue;}
 if(line.includes('|')&&/^\s*\|?\s*:?-{3,}/.test(lines[i+1]??'')){const rows=[line];i+=2;while(i<lines.length&&lines[i].includes('|'))rows.push(lines[i++].trim());blocks.push({kind:'table',lines:rows});continue;}
 const kind=/^(?:[-*]|\d+\.)\s/.test(line)?'list':'paragraph';const rows=[line];i++;
 while(i<lines.length&&lines[i].trim()&&!/^(?:#{1,6}\s|```)/.test(lines[i].trim())&&(kind==='list'?/^(?:[-*]|\d+\.)\s/.test(lines[i].trim()):! /^(?:[-*]|\d+\.)\s/.test(lines[i].trim()))){if(lines[i].includes('|')&&/^\s*\|?\s*:?-{3,}/.test(lines[i+1]??''))break;rows.push(lines[i++].trim());}
 blocks.push({kind,lines:rows});}
 return blocks;
}
