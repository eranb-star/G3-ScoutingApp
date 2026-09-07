import fs from "node:fs";
const root=new URL("../",import.meta.url),read=path=>fs.readFileSync(new URL(path,root),"utf8");
const tools=read("src/pages/ToolsInventoryPage.tsx"),finance=read("src/pages/FinanceAdminPage.tsx"),shell=read("src/components/WebPortalShell.tsx"),calendar=read("src/pages/UnifiedCalendarPage.tsx"),css=read("src/teamHub.css"),sql=read("../../backend/supabase/operations_finance_receiving_20260907.sql"),main=read("src/main.tsx");
const checks=[
 ["attendance is first-class web navigation",shell.includes('["/attendance", "Attendance"')],
 ["calendar opens event-scoped absence request",calendar.includes("/attendance?view=absences&event=${selected.id}")],
 ["dialog primary button contrast is explicit",css.includes(".attendance-dialog footer .hub-button")&&css.includes("color:#fff!important")],
 ["receiving uses atomic governed RPC",tools.includes('supabase.rpc("receive_purchase_request"')],
 ["receiving supports existing new and expense-only",["existing","new","expense_only"].every(x=>tools.includes(`value="${x}"`))],
 ["actual quantity and cost are required",tools.includes("Actual quantity received")&&tools.includes("Actual total cost")],
 ["finance route uses AdminGate",main.includes('<Route path="/admin/finance" element={<AdminGate><FinanceAdminPage /></AdminGate>}')],
 ["finance tables enforce RLS",["finance_expenses","finance_reimbursements","finance_budgets","finance_income"].every(x=>sql.includes(`alter table public.${x} enable row level security`))],
 ["purchase costs are requester/admin scoped",sql.includes("requesters and admins view purchases")&&sql.includes("requested_by=auth.uid() or public.is_admin()")],
 ["stock and expense are recorded in one receive transaction",sql.includes("insert into public.frc_stock_movements")&&sql.includes("insert into public.finance_expenses")],
 ["double receiving is rejected",sql.includes("request.status<>'ordered'")],
 ["reimbursements cannot exceed the balance",sql.includes("new_total>expense.amount")],
 ["finance dashboard tracks personal debt",finance.includes("Team owes personally")&&finance.includes("reimbursed_amount")],
 ["finance dashboard includes approved ordered and legacy purchases",finance.includes("Committed and legacy purchases")&&finance.includes('status==="approved"||x.status==="ordered"')&&finance.includes("legacyReceived")],
 ["legacy received purchases can be linked to an expense",finance.includes("Complete financial record")&&finance.includes("purchase_id:item.id")],
 ["budgets funds and expenses are manageable",finance.includes("Set budget")&&finance.includes("Record funds")&&finance.includes("Record expense")],
 ["mobile finance and dialogs collapse safely",css.includes(".finance-ledger>article{grid-template-columns:1fr")&&css.includes(".operations-dialog{grid-template-columns:1fr")]
];
let failed=0;for(const[name,ok]of checks){console.log(`${ok?"PASS":"FAIL"} ${name}`);if(!ok)failed++}if(failed)process.exit(1);console.log(`PASS ${checks.length} finance + receiving checks`);
