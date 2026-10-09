import {numericLogSummary,type LogChannel,type RobotLog} from './robotLog';
import {channelUnits} from './robotLogAnalysis';
export type SignalChoice={generation:number;component:number};
export function validWindow(log:RobotLog,start:number,end:number){return Number.isFinite(start)&&Number.isFinite(end)&&start>=log.start&&end<=log.end&&end>start;}
export function windowChannel(channel:LogChannel,start:number,end:number,component=0):LogChannel{
 return {...channel,...(channel.components?{name:channel.name+' ['+(channel.components[component]??'Unavailable')+']',type:'double',components:undefined,metadata:''}:{}),samples:channel.samples.filter(s=>s.time>=start&&s.time<=end).map(s=>({...s,value:channel.components&&Array.isArray(s.value)?s.value[component]??'Unavailable':s.value}))};
}
export function signalSummary(channel:LogChannel,start:number,end:number,component=0){
 const stats=numericLogSummary(windowChannel(channel,start,end,component));
 return {signal:channel.name,component:channel.components?.[component]??null,units:channel.components?null:channelUnits(channel),...(stats??{count:0,min:null,max:null,mean:null})};
}
export type LogWorkspace={log:RobotLog;name:string;hash:string;repository:string;commit:string;selected:number;component:number;modeIds:number[];windowStart:string;windowEnd:string;related:SignalChoice[]};
let memory:{member:string;workspace:LogWorkspace}|null=null;
export const workspaceKey=(member:string)=>`g3-log-workspace:${member}`;
export function readWorkspace(member:string){if(memory?.member!==member){memory=null;return null;}return memory.workspace;}
export function retainWorkspace(member:string,workspace:LogWorkspace){memory={member,workspace};try{const {log,...descriptor}=workspace;sessionStorage.setItem(workspaceKey(member),JSON.stringify(descriptor));}catch{/* In-memory return still works. */}}
export function readWorkspaceDescriptor(member:string):Omit<LogWorkspace,'log'>|null{try{const d=JSON.parse(sessionStorage.getItem(workspaceKey(member))??'null');return d&&/^[a-f0-9]{64}$/.test(d.hash)&&typeof d.name==='string'&&typeof d.repository==='string'&&typeof d.commit==='string'&&Number.isInteger(d.selected)&&Number.isInteger(d.component)&&typeof d.windowStart==='string'&&typeof d.windowEnd==='string'&&Array.isArray(d.modeIds)&&d.modeIds.every(Number.isInteger)&&Array.isArray(d.related)&&d.related.length<=3&&d.related.every((s:SignalChoice)=>Number.isInteger(s.generation)&&Number.isInteger(s.component))?d:null;}catch{return null;}}
