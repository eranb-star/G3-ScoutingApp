import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const {PGlite}=await import(process.argv[2]||'@electric-sql/pglite');const db=new PGlite();const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
try{
await db.exec(`create role authenticated;create role anon;create schema auth;create function auth.uid() returns uuid language sql as $$select '${id(1)}'::uuid$$;
create table team_members(id uuid primary key,display_name text,active boolean);insert into team_members values('${id(1)}','Member',true);
create function is_admin() returns boolean language sql as $$select current_setting('test.admin',true)='yes'$$;
create table finance_expenses(id uuid primary key,amount numeric,currency text,paid_by uuid,payment_source text,duplicate_of uuid,reimbursed_amount numeric,reimbursement_status text,updated_at timestamptz);
create table finance_income(id uuid primary key,received_on date,source_type text,source_name text,amount numeric,currency text,notes text);
create table finance_reimbursements(id uuid default gen_random_uuid(),expense_id uuid,amount numeric,reimbursed_on date,payment_method text,funding_source text,notes text,recorded_by uuid);
insert into finance_expenses values('${id(2)}',100,'ILS','${id(1)}','personal',null,0,'owed',now());
insert into finance_income values('${id(3)}','2026-10-01','other','Funds',200,'ILS',null);set test.admin='yes';`);
await db.exec(await fs.readFile(new URL('../../../backend/supabase/finance_recipient_repayments_20260919.sql',import.meta.url),'utf8'));
await db.exec(await fs.readFile(new URL('../../../backend/supabase/finance_refunds_20261015.sql',import.meta.url),'utf8'));
const refund=(n,amount,dest='original_payer',rev=null)=>db.query('select record_finance_refund($1,$2,$3,$4,$5,$6,$7)',[id(2),amount,dest,'2026-10-01','Actual supplier refund',id(n),rev&&id(rev)]);
await refund(10,20);await refund(10,20);await assert.rejects(refund(11,90),/within/);
const repay=`select record_recipient_repayment('${id(1)}',80,'[{"expense_id":"${id(2)}","amount":80}]','2026-10-02','Bank','Team','Actual transfer',80,200,'${id(12)}')`;
await db.exec(repay);await db.exec(repay);
assert.equal((await db.query('select reimbursed_amount from finance_expenses')).rows[0].reimbursed_amount,'80');
await refund(13,30);await assert.rejects(db.exec(`insert into finance_reimbursements(expense_id,amount) values('${id(2)}',1)`),/balance/);
const recover=`select recover_member_refund_credit('${id(1)}',30,'2026-10-03','team_account','Returned excess refund','${id(14)}')`;
await db.exec(recover);await db.exec(recover);assert.equal((await db.query('select count(*)::int n from finance_refund_recoveries')).rows[0].n,1);
await assert.rejects(db.exec(`select recover_member_refund_credit('${id(1)}',1,'2026-10-03','cash','Excess recovery','${id(15)}')`),/exceeds/);
await refund(16,10,'team_account');await refund(17,10,'team_account',16);
await assert.rejects(db.exec(`update finance_expenses set amount=1`),/Refund history/);
await db.exec("set test.admin='no'");await assert.rejects(refund(18,1),/administrator/);
console.log('PASS refund ledger: retry, amount cap, reimbursement net balance, post-reimbursement credit/recovery, cash reversal, permission and immutable history');
}finally{await db.close()}
