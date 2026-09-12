import {useLocalization} from '../lib/localization';
export type EvidenceItem={title:string;revision:string;url:string};
export function ReviewEvidenceEditor({items,onChange,disabled}:{items:EvidenceItem[];onChange:(items:EvidenceItem[])=>void;disabled:boolean}){
 const {pick}=useLocalization();
 function change(index:number,field:keyof EvidenceItem,value:string){onChange(items.map((item,i)=>i===index?{...item,[field]:value}:item));}
 return <fieldset className="review-evidence-editor" disabled={disabled}><legend>{pick('Evidence for this review','ראיות לביקורת זו')}</legend>
 <p>{pick('Add a fixed version link for each drawing, code change or test result.','הוסיפו קישור לגרסה קבועה לכל שרטוט, שינוי קוד או תוצאת בדיקה.')}</p>
 {items.map((item,index)=><div className="review-evidence-item" key={index}>
 <strong>{pick('Evidence','ראיה')} {index+1}</strong>
 <label>{pick('Title','כותרת')}<input required maxLength={160} value={item.title} onChange={e=>change(index,'title',e.target.value)}/></label>
 <label>{pick('Exact revision / version','גרסה מדויקת')}<input required maxLength={120} value={item.revision} onChange={e=>change(index,'revision',e.target.value)}/></label>
 <label>{pick('Link','קישור')}<input required type="url" pattern="https://.*" maxLength={2048} dir="ltr" value={item.url} onChange={e=>change(index,'url',e.target.value)}/></label>
 {items.length>1?<button type="button" className="hub-button secondary" onClick={()=>onChange(items.filter((_,i)=>i!==index))}>{pick('Remove evidence','הסרת ראיה')} {index+1}</button>:null}
 </div>)}
 {items.length<12?<button type="button" className="hub-button secondary" onClick={()=>onChange([...items,{title:'',revision:'',url:''}])}>{pick('Add evidence','הוספת ראיה')}</button>:null}
 </fieldset>;
}
export function ReviewEvidenceLinks({items}:{items:EvidenceItem[]}){
 return <ul className="review-evidence-links">{items.map((item,i)=><li key={i}><a href={/^https:\/\//.test(item.url)?item.url:undefined} target="_blank" rel="noopener noreferrer">{item.title} ↗</a><small>{item.revision}</small></li>)}</ul>;
}
