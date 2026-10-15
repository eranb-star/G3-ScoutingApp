import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const {PGlite}=await import(process.argv[2]||'@electric-sql/pglite');const db=new PGlite();
const id=n=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`,token='synthetic-device-registration-not-a-real-token';
try{
 await db.exec(`create role authenticated;create role anon;create schema auth;create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
 create table team_members(id uuid primary key,active boolean,must_change_password boolean);
 insert into team_members values('${id(1)}',true,false),('${id(2)}',true,false),('${id(3)}',false,false),('${id(4)}',true,true);`);
 await db.exec(await fs.readFile(new URL('../../../backend/supabase/push_notifications.sql',import.meta.url),'utf8'));
 await db.exec(await fs.readFile(new URL('../../../backend/supabase/push_device_registration_20261015.sql',import.meta.url),'utf8'));
 await db.exec(`grant usage on schema public,auth to authenticated;grant select,update on push_tokens to authenticated;set role authenticated;set test.uid='${id(1)}'`);
 await assert.rejects(db.query('select register_push_device($1)',['bad']),/Invalid/);
 await db.query('select register_push_device($1)',[token]);
 await db.query('select register_push_device($1)',[token+'-second-phone']);
 assert.equal((await db.query('select token from push_tokens')).rows.length,2);
 await db.exec(`set test.uid='${id(2)}'`);await db.query('select register_push_device($1)',[token]);
 assert.equal((await db.query('select token from push_tokens')).rows.length,1);
 await db.exec(`set test.uid='${id(1)}'`);assert.equal((await db.query('select token from push_tokens')).rows.length,1,'account switch moves only this device');
 assert.equal((await db.query('update push_tokens set active=false where token=$1 returning token',[token])).rows.length,0,'old account cannot deactivate new owner');
 for(const member of [3,4]){await db.exec(`set test.uid='${id(member)}'`);await assert.rejects(db.query('select register_push_device($1)',[token]),/active signed-in/);}
 await db.exec('reset role;set role anon');await assert.rejects(db.query('select register_push_device($1)',[token]),/permission denied/);
 console.log('PASS device registration: account switching, multiple phones, old-owner isolation, inactive/password-change/anonymous denial');
}finally{await db.close();}
