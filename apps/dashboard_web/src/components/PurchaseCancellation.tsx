import {useState} from 'react';
import AccessibleDialog from './AccessibleDialog';
import {useLocalization} from '../lib/localization';
import {supabase} from '../supabase';
import {money} from '../lib/finance';
import type {ConfirmedOrder} from '../lib/purchaseCommitments';
export default function PurchaseCancellation({order,onClose,onSaved}:{order:ConfirmedOrder;onClose:()=>void;onSaved:()=>Promise<void>}){
 const {pick}=useLocalization(),[quantity,setQuantity]=useState(''),[amount,setAmount]=useState(''),[reason,setReason]=useState(''),[date,setDate]=useState(new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Jerusalem'})),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[request]=useState(()=>crypto.randomUUID());
 async function save(){if(busy)return;setBusy(true);setError('');try{const r=await supabase.rpc('cancel_confirmed_order_scope',{p_order:order.id,p_revision:order.revision,p_quantity:Number(quantity),p_amount:Number(amount),p_date:date,p_reason:reason.trim(),p_request:request});if(r.error)throw r.error;await onSaved();onClose();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <AccessibleDialog title={pick('Cancel undelivered order scope','ביטול חלק שטרם התקבל')} onClose={()=>{if(!busy)onClose();}} className="purchase-reconciliation"><form onSubmit={e=>{e.preventDefault();void save();}}>
 <h2>{pick('Cancel undelivered quantity','ביטול כמות שטרם התקבלה')}</h2><p>{pick('Record a cancellation confirmed with the supplier. This reduces the outstanding order; it does not delete the request, reverse stock, reimburse anyone or create a refund.','רשמו ביטול שסוכם עם הספק. הפעולה מפחיתה את ההזמנה הפתוחה; אינה מוחקת בקשה, משנה מלאי, מחזירה כסף או יוצרת זיכוי.')}</p>
 <p>{pick('Original order total','סכום הזמנה מקורי')}: {money(order.total,order.currency)}</p>
 <label>{pick('Quantity cancelled','כמות לביטול')}<input required type="number" min="0.01" step="0.01" value={quantity} onChange={e=>{setQuantity(e.target.value);setConfirmed(false);}}/></label>
 <label>{pick(`Amount no longer owed to supplier (${order.currency})`,`סכום שלא נדרש יותר לספק (${order.currency})`)}<input required type="number" min="0" step="0.01" value={amount} onChange={e=>{setAmount(e.target.value);setConfirmed(false);}}/></label>
 <label>{pick('Effective date','תאריך הביטול')}<input required type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
 <label>{pick('Supplier confirmation / reason','אישור הספק / סיבה')}<textarea required minLength={4} maxLength={1000} value={reason} onChange={e=>setReason(e.target.value)}/></label>
 <label><input type="checkbox" required checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>{pick('I confirmed the cancelled quantity and value. Recorded expenses remain unchanged.','אימתתי את הכמות והסכום לביטול. הוצאות שנרשמו לא ישתנו.')}</label>
 {error&&<p role="alert">{error}</p>}<footer><button type="button" disabled={busy} onClick={onClose}>{pick('Back','חזרה')}</button><button className="hub-button" disabled={busy||!confirmed}>{busy?pick('Saving…','שומר…'):pick('Record cancellation','רישום ביטול')}</button></footer>
 </form></AccessibleDialog>;
}
