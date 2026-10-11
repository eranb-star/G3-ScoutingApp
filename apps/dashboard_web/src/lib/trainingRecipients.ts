export type TrainingRecipient = {id:string; role?:string};
export function selectTrainingRecipients<T extends TrainingRecipient>(people:T[], allowed:string[]|undefined, includeLeaders:boolean) {
  return people.filter(p=>(!allowed||allowed.includes(p.id)) && (p.role==='member'||p.role==='student'||includeLeaders&&p.role==='team_leader')).map(p=>p.id);
}
