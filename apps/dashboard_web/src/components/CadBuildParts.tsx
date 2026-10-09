import {useEffect, useMemo, useState} from 'react';
import {supabase} from '../supabase';
import {useLocalization} from '../lib/localization';
import './cadBuildParts.css';

type Row = {key:string;name:string;quantity:number;partId:string;microversion:string;configuration:string;paths:string[][]};
type Result = {snapshotId:string;microversion:string;coverage:'resolved'|'incomplete'|'unsupported';rows:Row[];issues:{code:string;path:string[]}[];excludedInstances:number};
export default function CadBuildParts({sourceId,snapshotId}:{sourceId:string;snapshotId:string}) {
  const {pick}=useLocalization();
  const issueLabels:Record<string,[string,string]>={
    ASSEMBLY_UNAVAILABLE:['Assembly data is missing. Refresh the design.','נתוני ההרכבה חסרים. רעננו את התכנון.'],
    UNRESOLVED_ASSEMBLY:['A referenced subassembly was not imported.','תת־הרכבה מקושרת לא יובאה.'],
    DUPLICATE_ASSEMBLY_DEFINITION:['Conflicting subassembly definitions require review.','הגדרות כפולות של תת־הרכבה דורשות בדיקה.'],
    DEPTH_LIMIT:['This assembly is too deeply nested for this import.','ההרכבה מקוננת מעבר למגבלת הייבוא.'],
    STRUCTURE_LIMIT:['The structure exceeds the import limit; totals are partial.','המבנה חורג ממגבלת הייבוא; הסכומים חלקיים.'],
    MISSING_INSTANCES:['A subassembly has no retrievable instance list.','רשימת המופעים של תת־הרכבה אינה זמינה.'],
    INVALID_INSTANCE_ID:['An instance identifier is missing or duplicated.','מזהה מופע חסר או כפול.'],
    ASSEMBLY_CYCLE:['A circular assembly reference needs review.','קישור מעגלי בין הרכבות דורש בדיקה.'],
    MISSING_PART_IDENTITY:['A part is missing its source or revision identity.','לחלק חסר מזהה מקור או גרסה.'],
    UNSUPPORTED_INSTANCE:['An assembly item could not be interpreted.','לא ניתן לפרש פריט בהרכבה.'],
  };
  const [data,setData]=useState<Result|null>(null),[error,setError]=useState(false),[retry,setRetry]=useState(0),[query,setQuery]=useState('');
  useEffect(()=>{
    let current=true;setData(null);setError(false);
    void (async()=>{
      try {
        const result=await supabase.functions.invoke('onshape-connector',{body:{action:'bom',sourceId,snapshotId}});
        if(result.error||result.data?.error||result.data?.snapshotId!==snapshotId||!Array.isArray(result.data?.rows))throw Error('Unavailable');
        if(current)setData(result.data);
      } catch {if(current)setError(true);}
    })();
    return()=>{current=false;};
  },[sourceId,snapshotId,retry]);
  const rows=useMemo(()=>data?.rows.filter(row=>`${row.name} ${row.partId}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))??[],[data,query]);
  return <section className="cad-panel cad-build-parts" aria-label={pick('Assembly parts review','סקירת חלקי ההרכבה')}>
    <h3>{pick('Assembly parts','חלקי ההרכבה')}</h3>
    <p>{pick('Quantities come from this imported assembly revision, independently of the 3D display. This list has not been released for manufacturing.','הכמויות מחושבות מגרסת ההרכבה שיובאה, בנפרד מתצוגת התלת־ממד. הרשימה אינה משוחררת לייצור.')}</p>
    {error?<div role="alert"><p>{pick('The parts list could not be loaded. No quantities have been confirmed.','לא ניתן לטעון את רשימת החלקים. הכמויות לא אושרו.')}</p><button onClick={()=>setRetry(value=>value+1)}>{pick('Try again','ניסיון חוזר')}</button></div>:!data?<p role="status">{pick('Reading assembly structure…','קורא את מבנה ההרכבה…')}</p>:data.coverage==='unsupported'?<p role="status">{pick('Select an Assembly to count installed occurrences. A Part Studio defines parts but does not establish the robot’s required quantities.','בחרו הרכבה כדי לספור מופעים. סטודיו חלקים מגדיר חלקים אך אינו קובע את הכמויות הדרושות לרובוט.')}</p>:<>
      <div className="cad-build-summary"><span><strong>{data.rows.length}</strong> {pick('distinct part revisions','גרסאות חלק שונות')}</span><span><strong>{data.rows.reduce((sum,row)=>sum+row.quantity,0)}</strong> {pick('resolved occurrences','מופעים שפוענחו')}</span><span>{pick('Import revision','גרסת ייבוא')}: <code>{data.microversion.slice(0,8)}</code></span></div>
      <p role="status">{data.coverage==='incomplete'?pick('Incomplete structure — do not use these totals to order or manufacture. Resolve the import issues below.','המבנה אינו מלא — אין להשתמש בסכומים להזמנה או לייצור. יש לפתור את בעיות הייבוא שלהלן.'):pick('Structure resolved. Purchased assemblies, materials, inventory matches and production quantities still require review.','המבנה פוענח. מכלולים קנויים, חומרים, התאמות למלאי וכמויות לייצור עדיין דורשים בדיקה.')}</p>
      {!!data.issues.length&&<details><summary>{pick('Import issues','בעיות ייבוא')} ({data.issues.length})</summary><ul>{data.issues.map((issue,i)=><li key={i}>{pick(...(issueLabels[issue.code]??['An import issue requires review.','בעיית ייבוא דורשת בדיקה.']))}{issue.path.length>0&&<> · <code>{issue.path.join(' / ')}</code></>}</li>)}</ul></details>}
      <label>{pick('Find a part','חיפוש חלק')}<input type="search" value={query} onChange={e=>setQuery(e.target.value)}/></label>
      <div className="cad-build-table"><table><caption>{pick('Imported leaf parts — before make/buy and stock reconciliation','חלקים שיובאו — לפני החלטת ייצור/רכש והתאמה למלאי')}</caption><thead><tr><th>{pick('Part','חלק')}</th><th>{pick('Quantity','כמות')}</th><th>{pick('Revision & occurrences','גרסה ומופעים')}</th></tr></thead><tbody>{rows.map(row=><tr key={row.key}><td><strong>{row.name}</strong><small>{row.partId}</small></td><td>{row.quantity}</td><td><details><summary><code>{row.microversion.slice(0,8)}</code></summary>{row.configuration&&<p>{row.configuration}</p>}<ul>{row.paths.map(path=><li key={JSON.stringify(path)}><code>{path.join(' / ')}</code></li>)}</ul></details></td></tr>)}</tbody></table></div>
      {!rows.length&&<p>{query?pick('No matching parts.','לא נמצאו חלקים תואמים.'):pick('No active leaf parts were resolved in this assembly.','לא פוענחו חלקים פעילים בהרכבה זו.')}</p>}
    </>}
  </section>;
}
