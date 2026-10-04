export const robotPurposes:Record<string,[string,string]>={
 'OFFSEASON_2026':['Offseason robot','רובוט קדם העונה'],
 'Rebuilt_Practise':['Leaders’ advanced practice','תרגול מתקדם למובילי הצוות'],
 'Rebuilt_2026':['2026 season robot','רובוט עונת 2026']
};
export const privateRobotContext=(repository?:string)=>!!repository&&repository.toLowerCase().startsWith('gluegunandglitter/')&&Object.keys(robotPurposes).some(n=>repository.split('/')[1]?.toLowerCase()===n.toLowerCase());
export function connectionMessage(status:string,pick:(en:string,he:string)=>string){
 if(status==='connected')return pick('Private robot repositories connected. Selected files are sent to G3 Assist only when you send a question.','מאגרי הרובוט הפרטיים מחוברים. הקבצים שנבחרו נשלחים ל-G3 Assist רק בשליחת שאלה.');
 if(status==='setup-required')return pick('Private connection awaiting administrator setup. Public repositories remain available.','החיבור הפרטי ממתין להגדרת מנהל. המאגרים הציבוריים זמינים.');
 if(status==='connection-error')return pick('Some private repositories could not be read. Ask an administrator to check GitHub access.','לא ניתן לקרוא חלק מהמאגרים הפרטיים. פנו למנהל לבדיקת הגישה ל-GitHub.');
 return pick('Private robot code requires the separate “Read private robot code” role permission.','קוד רובוט פרטי דורש הרשאת תפקיד נפרדת: קריאת קוד רובוט פרטי.');
}
