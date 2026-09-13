import {useLocalization} from '../lib/localization';
export type PhysicalMeasurement={value:string;unit:string;samples:string;instrument:string;calibration:string;conditions:string;asset:string};
export const emptyMeasurement=():PhysicalMeasurement=>({value:'',unit:'',samples:'1',instrument:'',calibration:'',conditions:'',asset:''});
export function PhysicalMeasurementEditor({value,onChange}:{value:PhysicalMeasurement;onChange:(value:PhysicalMeasurement)=>void}){
 const {pick}=useLocalization();
 const change=(key:keyof PhysicalMeasurement,v:string)=>onChange({...value,[key]:v});
 return <fieldset className="review-evidence-editor"><legend>{pick('Physical measurement','מדידה פיזית')}</legend>
 <label>{pick('Measured value','ערך שנמדד')}<input required type="number" step="any" value={value.value} onChange={e=>change('value',e.target.value)}/></label>
 <label>{pick('Unit (for example N, mm, A)','יחידה (למשל N, mm, A)')}<input required maxLength={40} value={value.unit} onChange={e=>change('unit',e.target.value)}/></label>
 <label>{pick('Number of samples','מספר דגימות')}<input required type="number" min={1} max={1000000} step={1} value={value.samples} onChange={e=>change('samples',e.target.value)}/></label>
 <label>{pick('Instrument / measurement method','מכשיר / שיטת מדידה')}<input required minLength={2} maxLength={200} value={value.instrument} onChange={e=>change('instrument',e.target.value)}/></label>
 <label>{pick('Calibration / reference (explain if not applicable)','כיול / ייחוס (הסבירו אם לא רלוונטי)')}<input required minLength={2} maxLength={500} value={value.calibration} onChange={e=>change('calibration',e.target.value)}/></label>
 <label>{pick('Physical robot / prototype identifier','מזהה הרובוט / אב־הטיפוס הפיזי')}<input required minLength={2} maxLength={200} value={value.asset} onChange={e=>change('asset',e.target.value)}/></label>
 <label>{pick('Test conditions and setup','תנאי הבדיקה והמערך')}<textarea required minLength={3} maxLength={2000} rows={3} value={value.conditions} onChange={e=>change('conditions',e.target.value)}/></label>
 </fieldset>;
}
