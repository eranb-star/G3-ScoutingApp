type Pick = (en: string, he: string) => string;
export function academyLabel(value:string,pick:Pick):string {
  const labels:Record<string,[string,string]>={mechanical:['Mechanical','מכניקה'],electrical:['Electrical','חשמל'],software:['Software','תוכנה'],cad:['CAD','תיב״ם'],strategy:['Strategy','אסטרטגיה'],drive_pit:['Drive & pit','נהיגה ופיט'],business:['Business','ניהול'],safety:['Safety','בטיחות'],assignment:['Assignment','מטלה'],quiz:['Quiz','מבחן'],practical:['Practical','הדגמה מעשית'],reflection:['Reflection','סיכום למידה'],submitted:['Awaiting review','ממתין לבדיקה'],reviewed:['Reviewed','נבדק'],approved:['Approved','אושר'],changes_requested:['Changes requested','נדרשים תיקונים'],draft:['Draft','טיוטה']};
  return labels[value]?pick(...labels[value]):value;
}
export const LANGUAGE_SEPARATOR = '\n---HE---\n';
const separatorPattern=/[\r\n\t ]*---HE---[\r\n\t ]*/;
export function authorText(value:string,language:'en'|'he'):string {
  if(!separatorPattern.test(value))return value;
  return value.split(separatorPattern)[language==='en'?0:1]??'';
}
export function updateAuthorText(value:string,next:string,language:'en'|'he'):string {
  const separator=value.match(separatorPattern)?.[0];
  if(!separator)return next;
  const parts=value.split(separatorPattern);parts[language==='en'?0:1]=next;
  return parts.slice(0,2).join(separator);
}
/** Display only; never use this result as a stored quiz option or answer key. */
export function academyText(value: string | null | undefined, pick: Pick): string {
  const text = value ?? '';
  if (!separatorPattern.test(text)) return text;
  const [en, he] = text.split(separatorPattern);
  const preferred = pick(en, he ?? '');
  return preferred.trim() ? preferred : `${en || he || ''} (${pick('translation unavailable', 'תרגום אינו זמין')})`;
}
export function academyFeedback(value: string | null | undefined, pick: Pick): string {
  let text = academyText(value, pick);
  // Exact legacy server-generated phrases only. Human-authored feedback is preserved.
  const phrases: [string, string, string][] = [
    ['Knowledge check passed / בדיקת הידע עברה. ', 'Knowledge check passed. ', 'בדיקת הידע עברה. '],
    ['Review the lesson and retry / חזרו לשיעור ונסו שוב. ', 'Review the lesson and retry. ', 'חזרו לשיעור ונסו שוב. '],
    ['Review questions / שאלות לחזרה: ', 'Review questions: ', 'שאלות לחזרה: '],
  ];
  for (const [source, en, he] of phrases) text = text.replace(source, pick(en, he));
  return text;
}
