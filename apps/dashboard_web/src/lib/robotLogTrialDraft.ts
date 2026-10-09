export type LogTrialDraft={schema:1;fileSha256:string;start:number;end:number;repository:string;commit:string;kind:'physical'|'simulated';partial:boolean};
export const logTrialDraftKey=(member:string)=>'g3-log-trial-draft:'+member;
export function parseLogTrialDraft(value:unknown):LogTrialDraft{
 const d=value as LogTrialDraft;
 if(!d||d.schema!==1||!/^([a-f0-9]{64})$/.test(d.fileSha256)||![d.start,d.end].every(Number.isFinite)||d.end<=d.start||d.start<0||d.end-d.start>100000||!['physical','simulated'].includes(d.kind)||typeof d.partial!=='boolean'||typeof d.repository!=='string'||d.repository.length>150||typeof d.commit!=='string'||(d.commit!==''&&!/^[a-f0-9]{40}$/.test(d.commit)))throw Error('INVALID_LOG_DRAFT');
 return {schema:1,fileSha256:d.fileSha256,start:d.start,end:d.end,repository:d.repository,commit:d.commit,kind:d.kind,partial:d.partial};
}
