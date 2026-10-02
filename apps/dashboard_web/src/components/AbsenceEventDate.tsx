import {absenceEventRange,type AbsenceEvent} from '../lib/absenceDates';
import {useLocalization} from '../lib/localization';
export default function AbsenceEventDate({event}:{event?:AbsenceEvent}){
 const {language,pick}=useLocalization();return <div className="absence-event-date"><span>{pick('Absence for · Israel time','היעדרות עבור · שעון ישראל')}</span><strong>{absenceEventRange(event,language)}</strong>{event?.cancelled&&<b>{pick('Calendar event cancelled','האירוע בוטל בלוח השנה')}</b>}</div>;
}
