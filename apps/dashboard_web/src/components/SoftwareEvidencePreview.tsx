import {useLocalization} from '../lib/localization';
import type {SoftwareSelection} from './SoftwareMentorContext';
export type EvidenceRow={id:string;path:string;revision:string;url:string;text:string;lines:number;ranges?:[number,number][]};
export type EvidencePreview={signature:string;selection:SoftwareSelection;rows:EvidenceRow[]};
export const reviewSignature=(question:string,selection:SoftwareSelection|null)=>JSON.stringify([question.trim(),selection]);
export default function SoftwareEvidencePreview({preview}:{preview:EvidencePreview}){
 const {pick}=useLocalization();return <section className="software-evidence-preview" aria-label={pick('Prepared code evidence','ראיות קוד מוכנות')}>
 <h3>{pick('Evidence ready · review before sending','הראיות מוכנות · בדקו לפני שליחה')}</h3><p><strong dir="ltr">{preview.selection.repository}</strong> · {preview.selection.paths.length} {pick('selected files','קבצים נבחרים')}</p>
 <p>{pick('Only the sections below will be reviewed. Omitted lines and other files are outside scope. No AI call, build or test has run.','רק הקטעים להלן ייבדקו. שורות שהושמטו וקבצים אחרים מחוץ לתחום. טרם הופעלו AI, בנייה או בדיקה.')}</p>
 {preview.selection.base&&<p>{pick('Compare the base and target sections below. Missing content may be excluded or unsupported; it is not proof of deletion.','השוו את קטעי הבסיס והיעד להלן. תוכן חסר עשוי להיות מסונן או לא נתמך; אין זו הוכחת מחיקה.')}</p>}
 {preview.rows.map(row=><details key={row.id}><summary><span dir="ltr">{row.path}</span> · {row.revision===preview.selection.base?pick('BASE','בסיס'):pick('TARGET','יעד')} <code>{row.revision.slice(0,8)}</code></summary><a href={row.url} target="_blank" rel="noreferrer">{pick('Open exact source','פתיחת המקור המדויק')} ↗</a><p>{pick('Included line ranges','טווחי שורות כלולים')}: {(row.ranges??[[1,row.lines]]).map(r=>r.join('–')).join(', ')}</p><pre dir="ltr">{row.text}</pre></details>)}
 <p>{pick('Run review sends this selected code and your question to Gemini and saves the answer in your private Assist conversation.','הפעלת ביקורת שולחת את הקוד הנבחר והשאלה ל-Gemini ושומרת את התשובה בשיחת Assist האישית.')}</p></section>;
}
