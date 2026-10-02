import {useMemo,useState} from 'react';
import {DEFAULT_ROBUSTNESS,routeRobustness} from '../lib/routeRobustness';
import type {AutoPlan} from '../lib/autonomousExport';
import {useLocalization} from '../lib/localization';
import TwinNumberInput from './TwinNumberInput';
export default function RouteRobustness({plan}:{plan:AutoPlan}){
 const {pick}=useLocalization(),[limits,setLimits]=useState(DEFAULT_ROBUSTNESS);
 const results=useMemo(()=>routeRobustness(plan.season,plan.robot,plan.route,limits),[plan.season,JSON.stringify(plan.robot),plan.route,limits]);
 const labels=[pick('Nominal','בסיס'),pick('Slower motion','תנועה איטית'),pick('Delayed actions','פעולות מתעכבות'),'+X','−X','+Y','−Y',pick('Combined stress','שילוב הפרעות')];
 return <section className="ep-robustness"><h3>{pick('Test route robustness','בדיקת עמידות המסלול')}</h3><p>{pick('What if motion is slower, actions take longer or the whole path is displaced? These eight repeatable sensitivity cases are assumptions—not measured success rates or a camera-error model.','מה קורה כשהתנועה איטית, הפעולות מתעכבות או המסלול כולו מוסט? שמונה בדיקות רגישות חוזרות לפי הנחות — לא שיעורי הצלחה מדודים או מודל שגיאת מצלמה.')}</p><div className="ep-controls">
 <label>{pick('Motion reduction (%)','הפחתת תנועה (%)')}<TwinNumberInput value={limits.speedLoss*100} onCommit={n=>setLimits(v=>({...v,speedLoss:n/100}))} min={0} max={50} step={5}/></label>
 <label>{pick('Extra time per action (s)','תוספת זמן לפעולה (ש׳)')}<TwinNumberInput value={limits.actionDelay} onCommit={n=>setLimits(v=>({...v,actionDelay:n}))} min={0} max={2} step={.05}/></label>
 <label>{pick('Path displacement (m)','הסטת מסלול (מ׳)')}<TwinNumberInput value={limits.positionError} onCommit={n=>setLimits(v=>({...v,positionError:n}))} min={0} max={.5} step={.05}/></label></div>
 {plan.route.length<2?<p>{pick('Add a route to evaluate its robustness.','הוסיפו מסלול לבדיקת עמידותו.')}</p>:<><div className="ep-robustness-results">{results.map((r,i)=><article key={r.id}><strong>{labels[i]}</strong>{r.unsupported?<span>{pick('Scenario outside supported limits','התרחיש מחוץ למגבלות הנתמכות')}</span>:<span>{r.result.seconds.toFixed(2)} s · {pick('margin','מרווח')} {r.result.margin.toFixed(2)} s</span>}<b>{r.result.errors.length?pick('Revise route','נדרש תיקון'):r.result.warnings.length?pick('Review clearance / reserve','בדיקת מרווחים'):pick('Within modeled limits','בתוך המגבלות במודל')}</b>{!!(r.result.errors.length+r.result.warnings.length)&&<details><summary>{pick('Locations & reasons','מיקומים וסיבות')}</summary><ul>{[...r.result.errors,...r.result.warnings].map(t=><li key={t}>{t}</li>)}</ul></details>}</article>)}</div><p>{pick('Use the smallest time margin to choose a simpler route or earlier handoff. Clearance uses the existing approximate obstacles; verify the actual CAD and physical robot.','השתמשו במרווח הזמן הקטן ביותר לבחירת מסלול פשוט או העברה מוקדמת לנהג. בדיקת המרווח משתמשת במכשולים המשוערים; אמתו מול CAD והרובוט.')}</p></>}
 </section>;
}
