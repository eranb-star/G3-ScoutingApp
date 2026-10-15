import {cents} from './finance';

/** Original estimates are evidence, never inferred confirmed order amounts. */
export type PurchaseCommitment = {
 id:string; quantity:number; approved_quantity:number|null; estimated_cost:number|null;
 status:string; actual_cost:number|null; actual_quantity:number|null;
};
export type ConfirmedOrder = {
 id:string; purchase_id:string; quantity:number; total:number; currency:string;
 cancelled_amount:number; cancelled_quantity?:number; revision:number;
};
export type ExpenseAllocation = {order_id:string; expense_id:string; amount:number};
export type AllocationExpense = {id:string; amount:number; currency:string; duplicate_of?:string|null};

export function orderCommitment(order:ConfirmedOrder,allocations:ExpenseAllocation[],expenses:AllocationExpense[]){
 const total=cents(order.total),cancelled=cents(order.cancelled_amount);
 if(!Number.isSafeInteger(total)||!Number.isSafeInteger(cancelled)||total<0||cancelled<0||cancelled>total)throw Error('Invalid order amounts');
 const related=allocations.filter(a=>a.order_id===order.id);
 let covered=0;
 for(const allocation of related){
  const expense=expenses.find(e=>e.id===allocation.expense_id),amount=cents(allocation.amount);
  if(!expense||expense.duplicate_of||expense.currency!==order.currency||!Number.isSafeInteger(amount)||amount<=0)throw Error('Invalid expense allocation');
  const allocated=allocations.filter(a=>a.expense_id===expense.id).reduce((sum,a)=>sum+cents(a.amount),0);
  if(allocated>cents(expense.amount))throw Error('Expense allocated above its value');
  covered+=amount;
 }
 if(covered>total-cancelled)throw Error('Expense coverage exceeds confirmed order value');
 return {total:total/100,cancelled:cancelled/100,covered:covered/100,remaining:(total-cancelled-covered)/100,currency:order.currency};
}

export function purchaseCommitmentSummary(purchase:PurchaseCommitment,orders:ConfirmedOrder[],allocations:ExpenseAllocation[],expenses:AllocationExpense[]){
 const confirmed=orders.filter(o=>o.purchase_id===purchase.id);
 return {
  requestedQuantity:purchase.quantity,
  approvedQuantity:purchase.approved_quantity,
  originalEstimate:purchase.estimated_cost,
  // Neither receipt actual_cost nor a request estimate proves an order was reconciled.
  needsReconciliation:confirmed.length===0&&['approved','ordered','received'].includes(purchase.status),
  orders:confirmed.map(order=>({id:order.id,quantity:order.quantity,...orderCommitment(order,allocations,expenses)})),
 };
}
