import {cents,type Expense,type ExpenseRefund} from './finance';
export type SupplierBill={id:string;vendor:string;reference:string;document_date:string;amount:number;currency:string;kind:'invoice'|'advance';revision:number;note:string;receipt_path?:string|null};
export type BillPayment={id:string;bill_id:string;expense_id:string;amount:number};
export type BillOrder={id:string;bill_id:string;order_id:string;amount:number};
export const billPaid=(bill:SupplierBill,payments:BillPayment[])=>payments.filter(p=>p.bill_id===bill.id).reduce((n,p)=>n+cents(p.amount),0)/100;
/** Existing expense payments are already in spending. Add only unpaid invoiced cost; exclude advances until invoiced. */
export const billExpenseAdjustment=(bills:SupplierBill[],payments:BillPayment[],currency:string)=>bills.filter(b=>b.currency===currency).reduce((n,b)=>n+(b.kind==='invoice'?cents(b.amount):0)-cents(billPaid(b,payments)),0)/100;
/** Refunds offset cost only for the expensed share; the advance share was never expensed. */
export function refundedCost(expenses:Expense[],refunds:ExpenseRefund[],bills:SupplierBill[],payments:BillPayment[],currency:string){return refunds.reduce((n,r)=>{const e=expenses.find(e=>e.id===r.expense_id&&e.currency===currency);if(!e||!Number(e.amount))return n;const advance=payments.filter(p=>p.expense_id===e.id&&bills.some(b=>b.id===p.bill_id&&b.kind==='advance')).reduce((sum,p)=>sum+cents(p.amount),0);return n+Math.round(cents(r.amount)*(1-advance/cents(e.amount)));},0)/100;}
