import {loadLimestone} from './limestoneRobot';
import {loadDarwin} from './publishedRobot';
import limestone from './limestoneManifest.json';

export type LearningRobot='darwin'|'limestone';
export type StudyArea='all'|'electrical'|'power'|'can'|'network'|'intake'|'shooter'|'hopper'|'drive';
export const learningRobots={
 darwin:{title:'6328 · Darwin · 2026',mb:37,source:'https://github.com/Mechanical-Advantage/RobotCode2026Public/tree/a6239fd90e8de72a7c1870c3c189820fcef6552d/ascope_assets/Robot_Darwin',credit:'Mechanical Advantage · MIT',remote:false},
 limestone:{title:'1678 · Limestone · 2026',mb:45,source:limestone.source,credit:'Citrus Circuits · public team export',remote:true}
};
export const studyAreas:{id:StudyArea;en:string;he:string}[]=[
 {id:'all',en:'Whole robot',he:'הרובוט המלא'},
 {id:'electrical',en:'Electrical overview',he:'סקירת חשמל'},
 {id:'power',en:'Power',he:'אספקת מתח'},
 {id:'can',en:'CAN & control',he:'CAN ובקרה'},
 {id:'network',en:'Network & vision',he:'רשת וראייה'},
 {id:'intake',en:'Intake',he:'איסוף'},
 {id:'shooter',en:'Shooter',he:'שיגור'},
 {id:'hopper',en:'Hopper',he:'אחסון כדורים'},
 {id:'drive',en:'Drivetrain',he:'הנעה'}
];
// Explicit authored CAD-name mappings, not inference of actual wire connections.
// Ancestor names preserve assembly membership for otherwise anonymous fasteners.
export function inStudyArea(area:StudyArea,path:string,robot:LearningRobot):boolean{
 const n=path.replaceAll('_',' ').toLowerCase();
 switch(area){
  case 'all':return true;
  case 'power':return /battery|breaker|pdp|pdh|simplified mpm|mpm saddle|power case|\bvrm\b/.test(n);
  case 'can':return /roborio|robo rio|kraken .*motor|pdp|pdh|canivore|pigeon|talon|spark max|mac mini/.test(n);
  case 'network':return /robot radio|radio mount|radio heats|mac mini|limelight|northstar/.test(n);
  case 'electrical':return inStudyArea('power',path,robot)||inStudyArea('can',path,robot)||inStudyArea('network',path,robot)||/robot signal light/.test(n);
  case 'intake':return robot==='darwin'?/2300 intake|darwin component 1/.test(n):/1678-26c-1500|limestone component 0/.test(n);
  case 'shooter':return robot==='darwin'?/3100 full wide launcher|darwin component 0/.test(n):/1600 shooter|limestone component 3/.test(n);
  case 'hopper':return robot==='darwin'?/0800 hopper|0410 superdexer|darwin component [23]/.test(n):/1678-26b-1900|limestone component [12]/.test(n);
  case 'drive':return /drivebase|sds mk5|swerve/.test(n);
 }
}

export {disposeLearningModel} from './limestoneRobot';
export async function loadLearningRobot(robot:LearningRobot,signal:AbortSignal){return robot==='darwin'?loadDarwin(signal):loadLimestone(signal);}
