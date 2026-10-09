export type ResponsibilityAction={source_table?:string|null;id:string;action_type:string;due_at:string|null;priority:string};
export type ResponsibilityState={action_id:string;status:string;snoozed_until:string|null};
export function visibleResponsibilities<T extends ResponsibilityAction>(actions:T[],states:ResponsibilityState[],mode:"home"|"work",now=Date.now()){
 return actions.filter(action=>{const state=states.find(item=>item.action_id===action.id);if(state?.status==="completed"&&!['project_tasks','project_task_collaborators'].includes(action.source_table??''))return false;if(state?.status==="snoozed"&&state.snoozed_until&&new Date(state.snoozed_until).getTime()>now)return false;const due=action.due_at?new Date(action.due_at).getTime():null;if(action.action_type==="meeting"&&due&&due<now-12*3600000)return false;return mode==="work"||!due||due<=now+7*86400000||(action.action_type!=="meeting"&&["high","urgent"].includes(action.priority));});
}

// Calendar-day presets preserve the user's local time across daylight-saving changes.
export function reminderAfterDays(days:number,now=new Date()){
 const target=new Date(now);target.setDate(target.getDate()+days);return target.toISOString();
}
export function customReminderTime(value:string,now=Date.now()){
 const time=new Date(value).getTime();return Number.isFinite(time)&&time>now?new Date(time).toISOString():null;
}
