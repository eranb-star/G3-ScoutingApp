import {useLocalization} from '../lib/localization';
import './cadPartMetadata.css';
export type CadMetadata={status:string;observedAt?:string;partNumber?:string;material?:string;vendor?:string;revision?:string;metadataMicroversion?:string};
export default function CadPartMetadata({value}:{value?:CadMetadata}){
 const {pick}=useLocalization();
 if(!value||value.status!=='available')return <p>{pick('Source metadata not available. Confirm material, part number and manufacturing process before release.','נתוני המקור אינם זמינים. יש לאמת חומר, מספר חלק ותהליך ייצור לפני שחרור.')}</p>;
 return <div className="cad-part-metadata"><dl>{[['Part number','מספר חלק',value.partNumber],['Material','חומר',value.material],['Vendor','יצרן / ספק',value.vendor],['Source revision label','תווית גרסת המקור',value.revision]].map(([en,he,data])=><div key={en}><dt>{pick(en!,he!)}</dt><dd>{data||pick('Not specified in Onshape','לא הוגדר ב־Onshape')}</dd></div>)}</dl><p>{pick('Source values require review. The manufacturing process is not inferred from geometry.','נתוני המקור דורשים בדיקה. תהליך הייצור אינו מוסק מהגאומטריה.')}</p>{value.observedAt&&<small>{pick('Metadata observed','נתוני מקור נקראו')}: {new Date(value.observedAt).toLocaleString(pick('en-GB','he-IL'))}</small>}</div>;
}
