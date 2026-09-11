import type {TaskDependency} from '../components/TaskDependencies';
export type OverdueTask={id:string;title:string;assignee_id:string|null;owner:string|null;due_at:string;priority:string;created_at:string;days_overdue:number;href:string};
export type ReadinessSignal={id:string;signal_type:'CRITICAL_ROBOT_ISSUE'|'STOCK_BELOW_MINIMUM';source_id:string;severity:'warning'|'high'|'critical';title:string;summary:string;assigned_user_id:string|null;href:string;opened_at:string};
export type HomeEvent={checklist?:{total:number;done:number;overdue:number};id:string;title:string;event_type:string;days_until:number;start_day:string;end_day:string;competition_event_id:string|null};
export type ReadinessData={task_dependencies?:TaskDependency[];approval_aging?:{threshold_hours:number;requests:{id:string;item_name:string;created_at:string;waiting_hours:number}[]}|null;overdue_tasks?:OverdueTask[];as_of:string;event:HomeEvent|null;events?:HomeEvent[];risks:ReadinessSignal[];purchases:{part_id:string;status:string;requests:number}[]};
export function eventContext(event:HomeEvent,pick:(en:string,he:string)=>string){
 if(event.days_until>0)return pick(`${event.days_until} days until ${event.title}`,`עוד ${event.days_until} ימים עד ${event.title}`);
 if(event.days_until===0)return pick(`${event.title} starts today`,`${event.title} מתחיל היום`);
 return pick(`${event.title} · Day ${1-event.days_until}`,`${event.title} · יום ${1-event.days_until}`);
}
export function priorityRank(action:{priority:string;due_at:string|null},now=Date.now()){
 if(action.priority==='urgent')return 0;
 if(action.priority==='high')return 1;
 if(action.due_at&&Date.parse(action.due_at)<now)return 2;
 if(action.due_at&&Date.parse(action.due_at)<=now+86400000)return 3;
 return action.due_at?4:5;
}
export type ReadinessAction={id:string;title:string;details:string|null;action_type:string;due_at:string|null;priority:string;created_at:string;destination?:string|null;source_table?:string|null;source_id?:string|null};
export function mergeReadinessPriorities(actions:ReadinessAction[],visible:ReadinessAction[],risks:ReadinessSignal[],memberId:string|undefined,now=Date.now()){
 const personal=risks.filter(r=>r.assigned_user_id===memberId&&r.signal_type==='CRITICAL_ROBOT_ISSUE');
 const isCritical=(a:ReadinessAction)=>a.source_table==='robot_issues'&&personal.some(r=>r.source_id===a.source_id);
 const combined=[...visible];
 for(const r of personal){if(combined.some(a=>a.source_table==='robot_issues'&&a.source_id===r.source_id))continue;
 combined.push(actions.find(a=>a.source_table==='robot_issues'&&a.source_id===r.source_id)??{id:`signal-${r.id}`,title:r.title,details:r.summary,action_type:'robot_issue',due_at:null,priority:'urgent',created_at:r.opened_at,destination:r.href,source_table:'robot_issues',source_id:r.source_id});}
 return combined.sort((a,b)=>Number(isCritical(b))-Number(isCritical(a))||priorityRank(a,now)-priorityRank(b,now)||(a.due_at??'9999').localeCompare(b.due_at??'9999')||a.id.localeCompare(b.id));
}

export function featuredEvents(data:ReadinessData):HomeEvent[]{return data.events??(data.event?[data.event]:[]);}

export function checklistContext(event:HomeEvent,pick:(en:string,he:string)=>string){const c=event.checklist;return c?.total?pick(`${c.done}/${c.total} preparation tasks complete · ${c.overdue} overdue`,`${c.done}/${c.total} משימות הכנה הושלמו · ${c.overdue} באיחור`):null;}

export function overdueLabel(task:OverdueTask,pick:(en:string,he:string)=>string){return task.days_overdue===0?pick('Overdue today','באיחור מהיום'):pick(`${task.days_overdue} days overdue`,`${task.days_overdue} ימים באיחור`);}
export function mergeOverdueTasks(actions:ReadinessAction[],visible:ReadinessAction[],tasks:OverdueTask[],memberId:string|undefined){
 const result=[...visible];for(const t of tasks.filter(t=>t.assignee_id===memberId)){const existing=actions.find(a=>a.source_table==='project_tasks'&&a.source_id===t.id);const item={...(existing??{id:`overdue-${t.id}`,action_type:'assignment'}),title:t.title,details:existing?.details??null,due_at:t.due_at,priority:t.priority,created_at:t.created_at,source_table:'project_tasks',source_id:t.id,destination:t.href};const index=result.findIndex(a=>a.source_table==='project_tasks'&&a.source_id===t.id);if(index>=0)result[index]=item;else result.push(item);}return result;
}
