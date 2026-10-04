import {useLocalization} from '../lib/localization';
import '../styles/filament.css';
import {filamentCost,filamentHebrew,type FilamentDetails} from '../lib/filamentInventory';
export {emptyFilament,filamentCost,filamentHebrew,type FilamentDetails} from '../lib/filamentInventory';
export default function FilamentFields({value,onChange}:{value:FilamentDetails;onChange:(v:FilamentDetails)=>void}){
 const {pick}=useLocalization();
 const change=(key:keyof FilamentDetails,text:string)=>onChange({...value,[key]:text});
 const options=(key:keyof FilamentDetails,label:string,choices:string[])=>{const custom=value[key]!==''&&!choices.includes(value[key]);return <label>{label}<select required value={custom?'__other':value[key]} onChange={e=>change(key,e.target.value==='__other'?' ':e.target.value)}><option value="">{pick('Choose…','בחירה…')}</option>{choices.map(v=><option key={v} value={v}>{pick(v,filamentHebrew[v]??v)}</option>)}<option value="__other">{pick('Other / custom…','אחר / מותאם…')}</option></select>{custom&&<input aria-label={`${label} · ${pick('custom value','ערך מותאם')}`} required maxLength={80} value={value[key].trimStart()} onChange={e=>change(key,e.target.value||' ')} placeholder={pick('Enter your value','הזינו ערך')}/>}</label>;};
 const cost=filamentCost(value);
 return <fieldset className="filament-fields wide"><legend>{pick('Filament details','פרטי פילמנט')}</legend><p className="wide">{pick('One inventory item per material, brand, colour and diameter. Stock is tracked in kilograms; spool weight excludes the empty spool.','פריט מלאי נפרד לכל חומר, מותג, צבע וקוטר. המלאי נמדד בקילוגרמים; משקל החומר אינו כולל את הסליל הריק.')}</p>
 {options('material',pick('Material','חומר'),['PLA','PLA+','PETG','PETG-CF','ABS','ASA','TPU','PA / Nylon','PA-CF','PC','PVA','HIPS'])}
 {options('brand',pick('Brand','מותג'),['Bambu Lab','eSUN','SUNLU','Polymaker','Prusament','Creality','Anycubic','Elegoo','Overture','Fiberlogy','Generic / unbranded'])}
 {options('colour',pick('Colour','צבע'),['Black','White','Grey','Pink','Purple','Red','Blue','Green','Yellow','Orange','Gold','Silver','Transparent','Multicolour'])}
 {options('finish',pick('Finish / variant','גימור / סוג'),['Standard','Matte','Silk','Sparkle','Wood-filled','Carbon-filled','Glow-in-the-dark'])}
 {options('diameter',pick('Diameter (mm)','קוטר (מ״מ)'),['1.75','2.85','3.00'])}
 {options('net_weight_g',pick('Net weight per spool (g)','משקל חומר בסליל (גרם)'),['250','500','750','1000','2000','3000','5000'])}
 <label>{pick('Price per spool (ILS)','מחיר לסליל (ש״ח)')}<input required type="number" min="0" step="0.01" value={value.spool_price} onChange={e=>change('spool_price',e.target.value)}/></label>
 <label>{pick('Empty spool weight (g) · optional','משקל סליל ריק (גרם) · רשות')}<input type="number" min="0" step="0.1" value={value.empty_spool_g} onChange={e=>change('empty_spool_g',e.target.value)}/></label>
 <label className="wide">{pick('Product link · optional','קישור למוצר · רשות')}<input type="url" maxLength={2000} value={value.product_url} onChange={e=>change('product_url',e.target.value)}/></label>
 <output className="wide filament-cost" aria-live="polite">{cost===null?pick('Enter spool price and weight to calculate cost.','הזינו מחיר ומשקל לחישוב עלות.'):pick(`Calculated cost: ₪${cost.toFixed(2)} / kg · ₪${(cost/1000).toFixed(4)} / gram`,`עלות מחושבת: ₪${cost.toFixed(2)} לק״ג · ₪${(cost/1000).toFixed(4)} לגרם`)}</output>
 </fieldset>;
}
