import type {PracticeResult} from './twinPractice';
import type {Exercise} from './practiceProgress';
import type {TestSetup,Trial} from './robotTests';
export const MISSION_VERSION='g3-driver-missions-v1';
export function missionOutcome(result:PracticeResult){
 const config=JSON.parse(result.settings),exercise:Exercise=config.exercise??'cycle',target=Number(config.missionTarget??10);
 if(!Number.isInteger(target)||target<1||target>999)throw Error('Invalid mission target');
 const value=exercise==='collection'?(result.collected??0):result.scored;
 return {exercise,target,value,passed:result.complete&&value>=target};
}
export function simulatedTrainingRecord(id:string,result:PracticeResult,reflection:string,nextTest:string){
 const outcome=missionOutcome(result),settings=JSON.parse(result.settings);
 if(result.seconds<=0||!Number.isFinite(result.seconds))throw Error('Run the mission before sharing');
 const setup:TestSetup&{simulation:unknown}={robot:String(settings.robotId??'reference'),mechanism:'Simulator training · '+outcome.exercise,codeRevision:MISSION_VERSION,batteryId:null,batteryVolts:null,conditions:`Simulated ${settings.year} field; ${settings.alliance??'red'}; ${result.input}`,procedure:`${outcome.exercise}; repeat the identical saved simulation settings. No physical measurement.`,criterion:`Complete session and ${outcome.exercise==='collection'?'collect':'score'} at least ${outcome.target} balls.`,units:'seconds/counts/volts',simulation:settings};
 const trial:Trial={seconds:result.seconds,attempted:1,successful:Number(outcome.passed),faults:0,passed:outcome.passed,note:JSON.stringify({collected:result.collected,scored:result.scored,shots:result.shots,accuracy:result.accuracy,distance:result.distance,complete:result.complete,reflection:reflection.slice(0,500),nextTest:nextTest.slice(0,500),faults:'Not measured; zero is not a fault-free certification'})};
 return {id,title:`Simulator · ${outcome.exercise}`,protocol:'driver' as const,evidence_kind:'simulated' as const,setup,trials:[trial]};
}
