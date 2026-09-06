export type ResponsibilityAction={id:string;action_type:string;due_at:string|null;priority:string};
export type ResponsibilityState={action_id:string;status:string;snoozed_until:string|null};
export function visibleResponsibilities<T extends ResponsibilityAction>(actions:T[],states:ResponsibilityState[],mode:"home"|"work",now=Date.now()){
 return actions.filter(action=>{const state=states.find(item=>item.action_id===action.id);if(state?.status==="completed")return false;if(state?.status==="snoozed"&&state.snoozed_until&&new Date(state.snoozed_until).getTime()>now)return false;const due=action.due_at?new Date(action.due_at).getTime():null;if(action.action_type==="meeting"&&due&&due<now-12*3600000)return false;return mode==="work"||!due||due<=now+7*86400000||["high","urgent"].includes(action.priority);});
}
