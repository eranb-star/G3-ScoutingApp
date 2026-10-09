import type {RobotLog,LogChannel,LogSample} from './robotLog';
export type LogIdentity={project:string|null;repository:string|null;commit:string|null;dirty:boolean|null;conflicts:boolean};
const text=(c:LogChannel)=>c.samples.filter(s=>typeof s.value==='string').map(s=>String(s.value));
export function logIdentity(log:RobotLog):LogIdentity{
 const values=(names:string[])=>[...new Set(log.channels.filter(c=>names.some(n=>c.name===n)).flatMap(text))];
 const names=(key:string)=>['/Metadata/','Metadata/','/RealMetadata/','RealMetadata/'].map(prefix=>prefix+key);
 const project=values(names('ProjectName'));
 const repository=values(names('GitRepository'));
 const commit=values(names('GitSHA'));
 const dirtyChannels=log.channels.filter(c=>names('GitDirty').includes(c.name));
 const dirtyValues=dirtyChannels.flatMap(c=>c.samples.map(s=>s.value));
 const dirty=dirtyValues.length?dirtyValues.every(v=>v===false||v===0||v==='0')?false:dirtyValues.every(v=>v===true||v===1||v==='1')?true:null:null;
 return {project:project.length===1?project[0]:null,repository:repository.length===1?repository[0]:null,commit:commit.length===1&&/^[a-f0-9]{40}$/i.test(commit[0])?commit[0].toLowerCase():null,dirty,conflicts:project.length>1||repository.length>1||commit.length>1};
}
export type ModeInterval={start:number;end:number;mode:'disabled'|'autonomous'|'teleop'|'test'|'unknown'};
export function standardModeChannels(log:RobotLog){
 return ['Enabled','Autonomous','Test'].map(name=>{const matches=log.channels.filter(c=>c.type==='boolean'&&c.name==='/DriverStation/'+name);return matches.length===1?matches[0].generation:-1;});
}
/** Explicit channel mapping avoids guessing an enabled signal from arbitrary names. */
export function logModes(log:RobotLog,enabled:LogChannel,auto:LogChannel,test?:LogChannel):ModeInterval[]{
 if([enabled,auto,...(test?[test]:[])].some(c=>c.type!=='boolean'||!log.channels.includes(c)))throw Error('INVALID_MODE_CHANNEL');
 const events:{time:number;key:'enabled'|'auto'|'test';value:boolean}[]=[];
 for(const [key,c] of [['enabled',enabled],['auto',auto],['test',test]] as const)if(c)for(const s of c.samples)if(typeof s.value==='boolean')events.push({time:s.time,key,value:s.value});
 events.sort((a,b)=>a.time-b.time);
 const state:{enabled?:boolean;auto?:boolean;test?:boolean}={};
 const intervals:ModeInterval[]=[];
 let previous=log.start;
 const mode=():ModeInterval['mode']=>state.enabled===false?'disabled':state.enabled!==true?'unknown':state.test===true?'test':state.auto===true?'autonomous':state.auto===false&&state.test===false?'teleop':'unknown';
 const append=(end:number)=>{if(end<=previous)return;const current=mode(),last=intervals[intervals.length-1];if(last&&last.mode===current)last.end=end;else intervals.push({start:previous,end,mode:current});previous=end;};
 for(let i=0;i<events.length;){const t=events[i].time;append(t);while(i<events.length&&events[i].time===t){const e=events[i++];state[e.key]=e.value;}}
 append(log.end);return intervals;
}
export function channelUnits(channel:LogChannel):string|null{
 try{const metadata=JSON.parse(channel.metadata);return typeof metadata.unit==='string'?metadata.unit:typeof metadata.units==='string'?metadata.units:null;}catch{return null;}
}
export function compareLogChannels(a:LogChannel,b:LogChannel){
 const unitsA=channelUnits(a),unitsB=channelUnits(b);
 return {compatible:a.name===b.name&&a.type===b.type&&unitsA!==null&&unitsA===unitsB,reasons:[...(a.name!==b.name?['SIGNAL_MISMATCH']:[]),...(a.type!==b.type?['TYPE_MISMATCH']:[]),...(unitsA===null||unitsB===null?['UNITS_UNKNOWN']:unitsA!==unitsB?['UNIT_MISMATCH']:[])]};
}
export function boundedLogEvidence(log:RobotLog,channel:LogChannel,start:number,end:number){
 if(!log.channels.includes(channel)||![start,end].every(Number.isFinite)||start<log.start||end>log.end||end<=start)throw Error('INVALID_LOG_WINDOW');
 const samples:LogSample[]=channel.samples.filter(s=>s.time>=start&&s.time<=end);
 const stride=Math.max(1,Math.ceil(samples.length/100));
 const result={signal:channel.name,type:channel.type,units:channelUnits(channel),start,end,totalSamples:samples.length,samples:samples.filter((_,i)=>i%stride===0),sampled:stride>1,partialLog:!log.complete,unsupportedRecords:channel.unsupported};
 if(new TextEncoder().encode(JSON.stringify(result)).length>16000)throw Error('EVIDENCE_WINDOW_TOO_LARGE');
 return result;
}
