// Only synthetic in-memory records. Never import a backend client in this module.
export function createReviewStore(now = Date.now()) {
  const iso = n => new Date(n).toISOString();
  const member = { id:'review-student', display_name:'Example student / תלמיד לדוגמה', role:'member', active:true, subteam:'mechanical', subteams:['mechanical'] };
  const rows = {
    team_meetings:[{id:'review-meeting',title:'Example workshop / סדנת דוגמה',starts_at:iso(now-3600000),ends_at:iso(now+3600000),attendance_closes_at:iso(now+7200000),status:'open',meeting_type:'workshop',opened_at:iso(now-3600000)}],
    attendance_records:[],
    team_projects:[{id:'review-project',name:'Example drivetrain / מערכת הנעה לדוגמה',status:'active',subteam:'mechanical',owner_id:member.id,due_at:null}],
    project_tasks:[{id:'review-task',project_id:'review-project',title:'Inspect example plate / בדיקת פלטה לדוגמה',status:'todo',assignee_id:member.id,created_by:member.id,archived:false,description:'Synthetic example: inspect the plate before assembly.',due_at:null}],
    role_permissions:[],project_engineering_records:[],project_task_collaborators:[],robot_build_jobs:[],project_task_review_gates:[],robot_studio_followups:[],robot_build_assemblies:[],training_courses:[],training_modules:[],training_enrollments:[],mechanical_calculations:[],mechanical_calculation_versions:[]
  };
  const error = message => ({data:null,error:{message}});
  function from(table) {
    const filters=[];let one=false,limit=Infinity,offset=0,sort=null,mutation=null,values=null;
    const run=()=>{
      if(!Object.hasOwn(rows,table))return error('Unavailable in isolated review: '+table);
      let selected=rows[table].filter(row=>filters.every(f=>f(row)));
      if(mutation){
        if(!['project_tasks'].includes(table)||!['update'].includes(mutation))return error('This write is not available in isolated review');
        if(Object.keys(values).some(k=>!['status','completed_at','updated_at'].includes(k)))return error('Unsupported review fields');
        selected.forEach(row=>Object.assign(row,values));
      }
      if(sort)selected.sort((a,b)=>String(a[sort.key]??'').localeCompare(String(b[sort.key]??''))*(sort.asc?1:-1));
      selected=selected.slice(offset,offset+limit);return {data:structuredClone(one?(selected[0]??null):selected),error:null};
    };
    const q={select(){return q;},eq(k,v){filters.push(r=>r[k]===v);return q;},in(k,v){filters.push(r=>v.includes(r[k]));return q;},is(k,v){filters.push(r=>(r[k]??null)===v);return q;},gte(k,v){filters.push(r=>r[k]>=v);return q;},lte(k,v){filters.push(r=>r[k]<=v);return q;},gt(k,v){filters.push(r=>r[k]>v);return q;},not(k,op,v){if(op==='in'){const items=v.replace(/[()]/g,'').split(',');filters.push(r=>!items.includes(r[k]));}else filters.push(()=>false);return q;},order(key,o){sort={key,asc:o?.ascending!==false};return q;},limit(n){limit=n;return q;},range(a,b){offset=a;limit=b-a+1;return q;},maybeSingle(){one=true;return q;},single(){one=true;return q;},update(v){mutation='update';values=v;return q;},insert(){mutation='insert';return q;},delete(){mutation='delete';return q;},then(resolve,reject){return Promise.resolve().then(run).then(resolve,reject);}};
    return q;
  }
  async function invoke(name,{body}={}){
    if(name!=='attendance')return error('External services are disabled in isolated review');
    if(body?.meetingId!=='review-meeting')return error('Unknown example meeting');
    if(body.latitude!==0)return {data:{error:'SIMULATION: manual attendance outside the workshop is rejected'},error:null};
    let record=rows.attendance_records[0];
    if(body.action==='check_in'&&!record){record={id:'review-attendance',meeting_id:'review-meeting',member_id:member.id,checked_in_at:new Date().toISOString(),checked_out_at:null};rows.attendance_records.push(record);}
    else if(body.action==='check_out'&&record&&!record.checked_out_at)record.checked_out_at=new Date().toISOString();
    else return error('Invalid example attendance transition');
    return {data:{attendance:structuredClone(record)},error:null};
  }
  const supabase={from,functions:{invoke},rpc:async name=>name==='is_admin'?{data:false,error:null}:name==='scoped_assignee_directory'?{data:[member],error:null}:['task_dependency_context','project_review_context','task_change_impact'].includes(name)?{data:[],error:null}:error('Unavailable review operation: '+name)};
  return {member,supabase};
}
