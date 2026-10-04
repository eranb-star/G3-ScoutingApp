import {useLocalization} from '../lib/localization';
import {filamentStockKg} from '../lib/filamentInventory';
export default function FilamentQuantity({spools,opened,weight,onSpools,onOpened}:{spools:string;opened:string;weight:string;onSpools:(v:string)=>void;onOpened:(v:string)=>void}){
 const {pick}=useLocalization(),kg=filamentStockKg(spools,weight,opened);
 return <fieldset className="filament-fields wide"><legend>{pick('How much filament are you adding?','כמה פילמנט מוסיפים?')}</legend>
 <label>{pick('Number of full spools (units)','מספר סלילים מלאים (יחידות)')}<input required type="number" min="0" step="1" value={spools} onChange={e=>onSpools(e.target.value)}/></label>
 <label>{pick('Remaining filament in opened spools (g)','יתרת חומר בסלילים פתוחים (גרם)')}<input type="number" min="0" step="0.1" value={opened} onChange={e=>onOpened(e.target.value)}/></label>
 <p className="wide">{pick(`Each full spool contains ${weight||'—'} g. For opened spools, enter their combined remaining filament weight, excluding empty spools.`,`כל סליל מלא מכיל ${weight||'—'} גרם, לפי המשקל שנבחר. לסלילים פתוחים הזינו את יתרת החומר הכוללת ללא משקל הסלילים הריקים.`)}</p>
 <output className="filament-cost wide" aria-live="polite">{kg===null?pick('Enter a whole number of spools and a valid weight.','הזינו מספר שלם של סלילים ומשקל תקין.'):pick(`Total stock to add: ${kg.toLocaleString()} kg (${(kg*1000).toLocaleString()} g)`,`סך המלאי להוספה: ${kg.toLocaleString()} ק״ג (${(kg*1000).toLocaleString()} גרם)`)}</output>
 </fieldset>;
}
