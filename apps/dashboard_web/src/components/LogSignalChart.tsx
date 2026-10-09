import {useLocalization} from '../lib/localization';
import {numericLogSummary,type LogChannel} from '../lib/robotLog';
import {channelUnits} from '../lib/robotLogAnalysis';
export default function LogSignalChart({channel,start,end,cursor,onCursor,label}:{channel:LogChannel;start:number;end:number;cursor:number;onCursor:(t:number)=>void;label?:string}){
 const {pick}=useLocalization(),stats=numericLogSummary(channel);
 const samples=channel.samples.filter(s=>typeof s.value==='number'&&Number.isFinite(s.value));
 const sampled=samples.filter((_,i)=>i%Math.max(1,Math.ceil(samples.length/900))===0);
 const point=stats?sampled.map(s=>`${10+780*(s.time-start)/(end-start)},${130-115*((s.value as number)-stats.min)/Math.max(.000001,stats.max-stats.min)}`).join(' '):'';
 const outside=!!samples.length&&(cursor<samples[0].time||cursor>samples[samples.length-1].time);
 const at=samples.reduce<typeof samples[number]|null>((best,s)=>Math.abs(s.time-cursor)<Math.abs((best?.time??Infinity)-cursor)?s:best,null);
 return <section className="log-trace"><h4 dir="auto">{label??channel.name}</h4><small>{channelUnits(channel)??pick('Units not recorded','יחידות לא תועדו')} · {pick('Independent vertical scale','סולם אנכי עצמאי')}</small>{stats?<><p className="log-metrics">{pick('Samples','דגימות')}: {stats.count} · Min {stats.min.toPrecision(5)} · Max {stats.max.toPrecision(5)} · {pick('Sample mean','ממוצע דגימות')} {stats.mean.toPrecision(5)}</p><svg viewBox="0 0 800 150" role="img" aria-label={pick('Signal in selected interval','אות בחלון הזמן הנבחר')} onClick={e=>{const r=e.currentTarget.getBoundingClientRect();onCursor(start+Math.max(0,Math.min(1,(e.clientX-r.left)/r.width))*(end-start));}}><polyline fill="none" stroke="currentColor" strokeWidth="2" points={point}/><line x1={10+780*(cursor-start)/(end-start)} x2={10+780*(cursor-start)/(end-start)} y1="0" y2="145" stroke="#25354b" strokeDasharray="4 4"/></svg><small>{pick('Nearest sample','הדגימה הקרובה')}: {outside?pick('Outside recorded sample range','מחוץ לטווח הדגימות המתועד'):at?`${at.time.toFixed(3)} s → ${at.value}`:'—'}</small></>:<p>{pick('No numeric samples in this interval.','אין דגימות מספריות בחלון זה.')}</p>}</section>;
}
