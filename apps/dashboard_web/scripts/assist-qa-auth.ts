import {createClient} from '@supabase/supabase-js';
const root=document.getElementById('root')!;
root.innerHTML=`<main><h1>G3 Assist · authenticated QA</h1><p>Isolated project: <b>cyooubycafubbnkjcqlw</b>. No AI provider key. This checks the deployed server, not a mock.</p>
<form id="login"><label>QA public API key<input id="key" required autocomplete="off"></label><label>Synthetic QA email<input id="email" type="email" value="mentor@g3-qa.invalid" required autocomplete="username"></label><label>Password<input id="password" type="password" required autocomplete="current-password"></label><button>Sign in to QA</button></form>
<section id="tests" hidden><p id="identity"></p><button id="run">Run permission and request checks</button><button id="logout">Sign out</button></section><pre id="result" role="status">Sign in with a synthetic QA account. Never use a production account.</pre></main>`;
const input=(id:string)=>(document.getElementById(id) as HTMLInputElement);
const result=document.getElementById('result')!;
let client:ReturnType<typeof createClient>|null=null;
document.getElementById('login')!.addEventListener('submit',async event=>{
 event.preventDefault();const email=input('email').value.trim();
 if(!email.endsWith('@g3-qa.invalid')){result.textContent='Only synthetic @g3-qa.invalid accounts are accepted.';return;}
 client=createClient('https://cyooubycafubbnkjcqlw.supabase.co',input('key').value.trim(),{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 result.textContent='Signing in…';
 const password=input('password').value;input('password').value='';
 const {error}=await client.auth.signInWithPassword({email,password});
 if(error){result.textContent=error.message;return;}
 document.getElementById('tests')!.hidden=false;document.getElementById('login')!.hidden=true;
 document.getElementById('identity')!.textContent=`Signed in: ${email}`;result.textContent='Authenticated. Ready to test.';
});
document.getElementById('run')!.addEventListener('click',async()=>{
 if(!client)return;const button=document.getElementById('run') as HTMLButtonElement;button.disabled=true;
 try{
 const permission=await client.rpc('has_permission',{requested_permission:'use_g3_assist'});
 const budget=await client.rpc('get_g3_assist_budget_status');
 const request=await client.functions.invoke('frc-assistant',{body:{requestId:crypto.randomUUID(),message:'Explain PID',language:'en'}});
 let body=request.data,status:number|null=null;
 if(request.error?.context instanceof Response){status=request.error.context.status;body=await request.error.context.clone().json().catch(()=>({error:'Non-JSON response'}));}
 const expected=permission.data===true?'PROVIDER_NOT_CONFIGURED':'ASSIST_ACCESS_DENIED';
 result.textContent=JSON.stringify({permission:permission.error?{error:permission.error.message}:permission.data,budget:budget.error?{error:budget.error.message}:{enabled:budget.data.enabled,activationApproved:budget.data.activationApproved,limitMicrousd:budget.data.limitMicrousd},assistant:{status,body},expectedCode:expected,pass:!permission.error&&body?.code===expected},null,2);
 }catch{result.textContent='Network test interrupted. No automatic retry.';}finally{button.disabled=false;}
});
document.getElementById('logout')!.addEventListener('click',async()=>{await client?.auth.signOut();client=null;document.getElementById('tests')!.hidden=true;document.getElementById('login')!.hidden=false;result.textContent='Signed out. Select the next synthetic QA account.';});
