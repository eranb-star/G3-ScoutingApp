import {useLocalization} from '../lib/localization';
import type {EvidenceRow} from './SoftwareEvidencePreview';
import type {SoftwareSelection} from './SoftwareMentorContext';
export type SavedReviewEvidence={selection:SoftwareSelection;rows:EvidenceRow[];partial:boolean;model:string;promptVersion:string;retrievedAt:string};
export default function SavedSoftwareEvidence({evidence}:{evidence:SavedReviewEvidence}){
 const {pick}=useLocalization();
 return <details className="software-evidence-preview"><summary>{pick('What this review actually read','מה הביקורת קראה בפועל')} · {evidence.rows.length} {pick('source excerpts','קטעי מקור')}</summary>
 <p>{pick(evidence.partial?'Partial source coverage: some lines were omitted to fit the review budget.':'Selected files only; this is not a whole-repository review.',evidence.partial?'כיסוי מקור חלקי: חלק מהשורות הושמטו בהתאם לתקציב הביקורת.':'קבצים נבחרים בלבד; זו אינה ביקורת של כל המאגר.')}</p>
 <p dir="ltr">{evidence.selection.repository} · {evidence.selection.revision}</p>
 <p>{pick('No build or robot test was run. Findings require team verification.','לא הורצה בנייה או בדיקת רובוט. הממצאים דורשים אימות של הצוות.')}</p>
 {evidence.rows.map(row=><details key={row.id}><summary dir="ltr">{row.path} · {row.revision.slice(0,8)}</summary><p>{pick('Included lines','שורות כלולות')}: {(row.ranges??[[1,row.lines]]).map(r=>r.join('–')).join(', ')}</p><pre dir="ltr">{row.text}</pre></details>)}
 <small>{evidence.model} · {evidence.promptVersion} · {new Date(evidence.retrievedAt).toLocaleString()}</small>
 </details>;
}
