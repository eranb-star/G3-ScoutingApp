import { FormEvent, useEffect, useState } from "react";
import { useLocalization } from "../lib/localization";
import { useMemberAuth } from "../lib/memberAuth";
import { supabase } from "../supabase";

type Course = { id:string; title:string; description:string; domain:string; target_subteam:string|null; required:boolean; active:boolean };
type Module = { id:string; course_id:string; title:string; instructions:string; sort_order:number };
type Enrollment = { id:string; course_id:string; member_id:string; status:string; due_at:string|null };
type Evidence = { id:string; enrollment_id:string; module_id:string; member_id:string; note:string; status:string; review_note:string|null };
type Person = { id:string; display_name:string; subteam:string|null };
type CourseForm = { title:string; description:string; domain:string; target_subteam:string; required:boolean };
const blank:CourseForm={title:"",description:"",domain:"mechanical",target_subteam:"",required:true};
const domains=["mechanical","electrical","software","cad","strategy","drive_pit","business","safety"];

function LinkedText({text}:{text:string}) {
  return <p>{text.split(/(https?:\/\/[^\s)\]}>,;]+)/g).map((part,index)=>part.startsWith("http")
    ? <a className="training-resource-link" href={part} target="_blank" rel="noreferrer" key={`${part}-${index}`}>{part.replace(/^https?:\/\//,"")} ↗</a>
    : part)}</p>;
}

export default function TrainingCenterPage(){
  const {pick}=useLocalization();
  const {profile}=useMemberAuth();
  const canEdit=profile?.role==="admin"||profile?.role==="mentor";
  const canDelete=profile?.role==="admin";
  const [courses,setCourses]=useState<Course[]>([]);
  const [modules,setModules]=useState<Module[]>([]);
  const [enrollments,setEnrollments]=useState<Enrollment[]>([]);
  const [evidence,setEvidence]=useState<Evidence[]>([]);
  const [people,setPeople]=useState<Person[]>([]);
  const [selected,setSelected]=useState("");
  const [message,setMessage]=useState("");
  const [formMode,setFormMode]=useState<"closed"|"create"|"edit">("closed");
  const [course,setCourse]=useState<CourseForm>(blank);
  const [moduleTitle,setModuleTitle]=useState("");
  const [instructions,setInstructions]=useState("");
  const [editingModule,setEditingModule]=useState<string|null>(null);
  const [assignmentMode,setAssignmentMode]=useState<"all"|"subteam"|"members">("members");
  const [assignSubteam,setAssignSubteam]=useState("");
  const [assignMembers,setAssignMembers]=useState<string[]>([]);
  const [assignDue,setAssignDue]=useState("");
  const [note,setNote]=useState<Record<string,string>>({});

  async function load(){
    const [c,m,e,v,p]=await Promise.all([
      supabase.from("training_courses").select("*").eq("active",true).order("created_at"),
      supabase.from("training_modules").select("*").order("sort_order"),
      supabase.from("training_enrollments").select("*"),
      supabase.from("training_evidence").select("*"),
      supabase.from("team_members").select("id,display_name,subteam").eq("active",true)
    ]);
    const next=(c.data??[]) as Course[];
    setCourses(next); setModules((m.data??[]) as Module[]); setEnrollments((e.data??[]) as Enrollment[]); setEvidence((v.data??[]) as Evidence[]); setPeople((p.data??[]) as Person[]);
    if(!selected&&next[0]) setSelected(next[0].id);
    else if(selected&&!next.some(x=>x.id===selected)) setSelected(next[0]?.id??"");
  }
  useEffect(()=>{void load();},[]);

  async function saveCourse(e:FormEvent){
    e.preventDefault();
    const payload={...course,target_subteam:course.target_subteam||null};
    const result=formMode==="edit"
      ? await supabase.from("training_courses").update(payload).eq("id",selected)
      : await supabase.from("training_courses").insert({...payload,created_by:profile?.id}).select("id").single();
    setMessage(result.error?.message??pick(formMode==="edit"?"Course updated.":"Course created.",formMode==="edit"?"הקורס עודכן.":"הקורס נוצר."));
    if(!result.error){if(formMode==="create"&&result.data?.id)setSelected(result.data.id);setFormMode("closed");setCourse(blank);await load();}
  }
  function editCourse(item:Course){setCourse({title:item.title,description:item.description,domain:item.domain,target_subteam:item.target_subteam??"",required:item.required});setFormMode("edit");window.scrollTo({top:0,behavior:"smooth"});}
  async function archiveCourse(item:Course){if(!confirm(pick(`Archive “${item.title}”? Student evidence will be preserved.`,`להעביר את „${item.title}” לארכיון? ראיות תלמידים יישמרו.`)))return;const {error}=await supabase.from("training_courses").update({active:false}).eq("id",item.id);setMessage(error?.message??pick("Course archived.","הקורס הועבר לארכיון."));if(!error)await load();}
  async function deleteCourse(item:Course){if(!confirm(pick(`Permanently delete “${item.title}” and all related evidence?`,`למחוק לצמיתות את „${item.title}” ואת כל הראיות הקשורות?`)))return;const {error}=await supabase.from("training_courses").delete().eq("id",item.id);setMessage(error?.message??pick("Course deleted.","הקורס נמחק."));if(!error)await load();}
  async function saveModule(e:FormEvent){e.preventDefault();const current=modules.find(x=>x.id===editingModule);const payload={course_id:selected,title:moduleTitle,instructions,sort_order:current?.sort_order??modules.filter(x=>x.course_id===selected).length*10+10};const result=editingModule?await supabase.from("training_modules").update(payload).eq("id",editingModule):await supabase.from("training_modules").insert(payload);setMessage(result.error?.message??pick(editingModule?"Module updated.":"Module added.",editingModule?"היחידה עודכנה.":"היחידה נוספה."));if(!result.error){setEditingModule(null);setModuleTitle("");setInstructions("");await load();}}
  async function deleteModule(item:Module){if(!confirm(pick(`Delete module “${item.title}”?`,`למחוק את היחידה „${item.title}”?`)))return;const {error}=await supabase.from("training_modules").delete().eq("id",item.id);setMessage(error?.message??pick("Module deleted.","היחידה נמחקה."));if(!error)await load();}
  function toggleMember(id:string){setAssignMembers(current=>current.includes(id)?current.filter(x=>x!==id):[...current,id]);}
  async function enroll(){const ids=assignmentMode==="all"?people.map(x=>x.id):assignmentMode==="subteam"?people.filter(x=>x.subteam===assignSubteam).map(x=>x.id):assignMembers;if(!selected||!ids.length){setMessage(pick("Choose at least one member or subteam.","בחרו לפחות חבר/ה או תת־צוות."));return;}const {error}=await supabase.from("training_enrollments").upsert(ids.map(member_id=>({course_id:selected,member_id,assigned_by:profile?.id,due_at:assignDue||null})),{onConflict:"course_id,member_id"});setMessage(error?.message??pick(`Course assigned to ${ids.length} members.`,`הקורס הוקצה ל־${ids.length} חברים.`));if(!error){setAssignMembers([]);await load();}}
  async function submit(enrollment:Enrollment,module:Module){if(!profile||!note[module.id]?.trim())return;const {error}=await supabase.from("training_evidence").upsert({enrollment_id:enrollment.id,module_id:module.id,member_id:profile.id,note:note[module.id].trim(),status:"submitted"},{onConflict:"enrollment_id,module_id"});if(!error){await supabase.from("training_enrollments").update({status:"in_progress"}).eq("id",enrollment.id);setNote({...note,[module.id]:""});await load();}setMessage(error?.message??pick("Evidence submitted.","הראיה נשלחה."));}
  async function review(item:Evidence,status:"approved"|"changes_requested"){const review_note=prompt(pick("Mentor review note","הערת חונך"));const {error}=await supabase.from("training_evidence").update({status,review_note:review_note||null,reviewed_by:profile?.id,reviewed_at:new Date().toISOString()}).eq("id",item.id);setMessage(error?.message??pick("Review saved.","הבדיקה נשמרה."));if(!error)await load();}

  const active=courses.find(x=>x.id===selected);
  const courseModules=modules.filter(x=>x.course_id===selected);
  const myEnrollment=enrollments.find(x=>x.course_id===selected&&x.member_id===profile?.id);
  return <main className="hub-page training-center-page">
    <header className="training-hero"><div><div className="hub-eyebrow">FRC 6740 · {pick("Structured qualification","הסמכה מובנית")}</div><h1>{pick("Skills Academy","אקדמיית מיומנויות")}</h1><p>{pick("Team leaders build FRC courses. Students complete practical modules and mentors validate the evidence.","מובילי הקבוצה בונים קורסי FRC. תלמידים משלימים יחידות מעשיות ומנטורים מאמתים את הראיות.")}</p></div>{canEdit?<button onClick={()=>{setCourse(blank);setFormMode(formMode==="create"?"closed":"create");}}>+ {pick("Create course","יצירת קורס")}</button>:null}</header>
    {message?<div className="hub-message" role="status">{message}</div>:null}
    {formMode!=="closed"?<form className="hub-card training-course-form" onSubmit={saveCourse}><div className="training-form-heading"><strong>{pick(formMode==="edit"?"Edit course":"New course",formMode==="edit"?"עריכת קורס":"קורס חדש")}</strong><button type="button" onClick={()=>setFormMode("closed")} aria-label={pick("Close","סגירה")}>×</button></div><label>{pick("Course title","שם הקורס")}<input required value={course.title} onChange={e=>setCourse({...course,title:e.target.value})}/></label><label>{pick("Domain","תחום")}<select value={course.domain} onChange={e=>setCourse({...course,domain:e.target.value})}>{domains.map(x=><option key={x}>{x}</option>)}</select></label><label>{pick("Target subteam","תת־צוות יעד")}<input value={course.target_subteam} onChange={e=>setCourse({...course,target_subteam:e.target.value})}/></label><label className="wide">{pick("What members will learn","מה החברים ילמדו")}<textarea required rows={3} value={course.description} onChange={e=>setCourse({...course,description:e.target.value})}/></label><label className="checkbox-label"><input type="checkbox" checked={course.required} onChange={e=>setCourse({...course,required:e.target.checked})}/>{pick("Required course","קורס חובה")}</label><button className="hub-button">{pick(formMode==="edit"?"Save changes":"Create course",formMode==="edit"?"שמירת שינויים":"יצירת קורס")}</button></form>:null}
    <div className="training-layout"><aside>{courses.map(x=><button className={selected===x.id?"is-active":""} onClick={()=>{setSelected(x.id);setFormMode("closed");}} key={x.id}><strong>{x.title}</strong><small>{x.domain}{x.required?` · ${pick("required","חובה")}`:""}</small></button>)}</aside><section>{active?<>
      <header className="training-course-header"><div><span>{active.domain}</span><h2>{active.title}</h2><p>{active.description}</p></div>{myEnrollment?<b>{myEnrollment.status}</b>:null}{canEdit?<div className="training-course-actions"><button onClick={()=>editCourse(active)}>{pick("Edit","עריכה")}</button><button onClick={()=>void archiveCourse(active)}>{pick("Archive","ארכיון")}</button>{canDelete?<button className="danger" onClick={()=>void deleteCourse(active)}>{pick("Delete","מחיקה")}</button>:null}</div>:null}</header>
      {canEdit?<div className="training-admin-tools"><form onSubmit={saveModule}><strong>{pick(editingModule?"Edit module":"Add module",editingModule?"עריכת יחידה":"הוספת יחידה")}</strong><input required value={moduleTitle} onChange={e=>setModuleTitle(e.target.value)} placeholder={pick("Module title","שם יחידה")}/><textarea required value={instructions} onChange={e=>setInstructions(e.target.value)} placeholder={pick("Instructions, completion criteria and resource links","הוראות, קריטריוני השלמה וקישורים למשאבים")}/><span><button>{pick(editingModule?"Save module":"Add module",editingModule?"שמירת יחידה":"הוספת יחידה")}</button>{editingModule?<button type="button" onClick={()=>{setEditingModule(null);setModuleTitle("");setInstructions("");}}>{pick("Cancel","ביטול")}</button>:null}</span></form><div className="training-assignment-panel"><strong>{pick("Assign this course","הקצאת הקורס")}</strong><div className="assignment-mode">{(["all","subteam","members"] as const).map(mode=><button type="button" className={assignmentMode===mode?"is-active":""} onClick={()=>setAssignmentMode(mode)} key={mode}>{mode==="all"?pick("Whole team","כל הקבוצה"):mode==="subteam"?pick("Subteam","תת־צוות"):pick("Select members","בחירת חברים")}</button>)}</div>{assignmentMode==="all"?<p>{pick(`All ${people.length} active members will receive this course.`,`כל ${people.length} החברים הפעילים יקבלו את הקורס.`)}</p>:assignmentMode==="subteam"?<select value={assignSubteam} onChange={e=>setAssignSubteam(e.target.value)}><option value="">{pick("Choose subteam…","בחירת תת־צוות…")}</option>{Array.from(new Set(people.map(x=>x.subteam).filter((x):x is string=>Boolean(x)))).sort().map(x=><option key={x}>{x}</option>)}</select>:<div className="member-multiselect">{people.map(x=><label key={x.id}><input type="checkbox" checked={assignMembers.includes(x.id)} onChange={()=>toggleMember(x.id)}/><span><strong>{x.display_name}</strong><small>{x.subteam??pick("No subteam","ללא תת־צוות")}</small></span></label>)}</div>}<label>{pick("Due date (optional)","תאריך יעד (אופציונלי)")}<input type="date" value={assignDue} onChange={e=>setAssignDue(e.target.value)}/></label><button type="button" onClick={()=>void enroll()}>{pick("Assign course","הקצאת קורס")}</button></div></div>:null}
      <ol className="training-modules">{courseModules.map((m,i)=>{const item=myEnrollment?evidence.find(x=>x.enrollment_id===myEnrollment.id&&x.module_id===m.id):null;return <li key={m.id}><b>{i+1}</b><div><header><h3>{m.title}</h3>{canEdit?<span><button onClick={()=>{setEditingModule(m.id);setModuleTitle(m.title);setInstructions(m.instructions);}}>{pick("Edit","עריכה")}</button>{canDelete?<button className="danger" onClick={()=>void deleteModule(m)}>{pick("Delete","מחיקה")}</button>:null}</span>:null}</header><LinkedText text={m.instructions}/>{item?<div className={`training-submission status-${item.status}`}><strong>{item.status}</strong><p>{item.note}</p>{item.review_note?<small>{item.review_note}</small>:null}{canEdit&&item.status==="submitted"?<span><button onClick={()=>void review(item,"approved")}>{pick("Approve","אישור")}</button><button onClick={()=>void review(item,"changes_requested")}>{pick("Request changes","בקשת שינוי")}</button></span>:null}</div>:myEnrollment?<form onSubmit={e=>{e.preventDefault();void submit(myEnrollment,m);}}><textarea required value={note[m.id]??""} onChange={e=>setNote({...note,[m.id]:e.target.value})} placeholder={pick("Describe or link your evidence.","תארו או קשרו את הראיה.")}/><button>{pick("Submit evidence","הגשת ראיה")}</button></form>:<small>{pick("This course has not been assigned to you.","קורס זה לא הוקצה לכם.")}</small>}</div></li>})}</ol>
    </>:null}</section></div>
  </main>;
}
