import {useLocalization} from '../lib/localization';
export default function BuildDraftNotice({restored,storageError}:{restored:boolean;storageError:boolean}){
 const {pick}=useLocalization();
 return storageError?<p role="alert">{pick('This browser could not retain the draft. Keep the form open until the server confirms your save.','הדפדפן לא הצליח לשמור את הטיוטה. השאירו את הטופס פתוח עד לאישור השמירה מהשרת.')}</p>:restored?<p role="status">{pick('Unsubmitted draft restored for this build. Review the current records before saving.','שוחזרה טיוטה שלא נשלחה לבנייה זו. בדקו את הרשומות העדכניות לפני השמירה.')}</p>:null;
}
