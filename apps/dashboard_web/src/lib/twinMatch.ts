/** REBUILT 2026 sections 6.4/6.5. t includes a 3 s practice countdown and scoring delays. */
export type MatchState={phase:string;remaining:number;periodRemaining:number;drive:boolean;auto:boolean;active:[boolean,boolean];credit:[boolean,boolean];warning:[boolean,boolean];chase:number|null;done:boolean};
export const MATCH_PRACTICE_SECONDS=169;
export function matchState(t:number,autoWinner:0|1):MatchState{
 if(!Number.isFinite(t))throw Error('Invalid match clock');
 const ends=[3,23,26,36,61,86,111,136,166,169],names=['READY','AUTO','AUTO SCORING','TRANSITION','SHIFT 1','SHIFT 2','SHIFT 3','SHIFT 4','ENDGAME','FINAL SCORING'];
 const i=ends.findIndex(end=>t<end),done=i<0;
 const activeAt=(time:number):[boolean,boolean]=>{if(time<3||time>=166||time>=23&&time<26)return [false,false];if(time<36||time>=136)return [true,true];const shift=Math.floor((time-36)/25);const on=(shift%2===0?1-autoWinner:autoWinner);return [on===0,on===1];};
 const active=activeAt(t),prev=activeAt(t-3+1e-8),next=activeAt(t+3);
 const credit:[boolean,boolean]=t>=3&&t<169?[active[0]||prev[0],active[1]||prev[1]]:[false,false];
 return {phase:done?'FINISHED':names[i],remaining:done?0:Math.max(0,ends[i]-t),periodRemaining:t<3?0:t<23?23-t:t<26?0:t<166?166-t:0,drive:!done&&(i===1||i>=3&&i<=8),auto:i===1,active,credit,warning:[active[0]&&!next[0],active[1]&&!next[1]],chase:i===3?autoWinner:null,done};
}
export function autoWinner(red:number,blue:number,tie:0|1):0|1{return red===blue?tie:red>blue?0:1;}
/** Synthesized practice cues, not official FMS recordings. */
export class PracticeAudio{
 private context:AudioContext|null=null;private key='';volume=.2;muted=false;
 unlock(){this.context??=new AudioContext();void this.context.resume();this.key='';}
 update(state:MatchState){const key=state.phase+(state.phase==='READY'?Math.ceil(state.remaining):'');if(key===this.key)return;this.key=key;if(this.muted||!this.context||this.context.state!=='running')return;const c=this.context,o=c.createOscillator(),g=c.createGain();o.frequency.value=state.done?260:state.phase==='READY'?660:880;g.gain.setValueAtTime(this.volume,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.25);o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+.3);o.onended=()=>{o.disconnect();g.disconnect();};}
 dispose(){void this.context?.close();this.context=null;}
}
