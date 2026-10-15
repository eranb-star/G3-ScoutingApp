import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const {PGlite}=await import(process.argv[2]||'@electric-sql/pglite');const db=new PGlite();
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
try{
await db.exec(`create role authenticated;create role anon;create schema auth;create function auth.uid() returns uuid language sql as $$select '${id(1)}'::uuid$$;
create table team_members(id uuid primary key,active boolean);insert into team_members values('${id(1)}',true);
create function is_admin() returns boolean language sql as $$select current_setting('test.admin',true)='yes'$$;
create table finance_expenses(id uuid primary key,expense_date date,category text,vendor text,description text,amount numeric,currency text,paid_by uuid,payment_source text,reimbursement_status text,notes text,duplicate_of uuid);
set test.admin='yes';`);
await db.exec(await fs.readFile(new URL('../../../backend/supabase/finance_expense_entry_20261015.sql',import.meta.url),'utf8'));
const values={expense_date:'2026-10-01',category:'Robot parts',vendor:'Supplier',description:'Actual purchase',amount:320,currency:'ILS',paid_by:id(1),payment_source:'personal',invoice_reference:'INV-10',notes:''};
const save=(n,v=values)=>db.query('select record_finance_expense($1,$2)',[id(n),JSON.stringify(v)]);
await save(2);await save(2);assert.equal((await db.query('select count(*)::int n from finance_expenses')).rows[0].n,1);
await assert.rejects(save(2,{...values,amount:300}),/different/);
await assert.rejects(save(3),/already recorded/);
await save(3,{...values,amount:20,invoice_override_reason:'Separate shipping allocation on same invoice'});
await assert.rejects(save(4,{...values,invoice_reference:'INV-11',amount:-1}),/valid amount/);
await assert.rejects(save(4,{...values,invoice_reference:'INV-11',paid_by:null}),/person who paid/);
await db.exec("set test.admin='no'");await assert.rejects(save(4),/administrator/);
assert.equal((await db.query('select sum(amount) total from finance_expenses')).rows[0].total,'340');
console.log('PASS expense entry: retry-safe save, payload conflict, invoice duplicate detection/explicit split, invalid amount/payer, admin denial');
}finally{await db.close();}
