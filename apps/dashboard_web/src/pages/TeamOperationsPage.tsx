import {useNavigate} from 'react-router-dom';
import {useLocalization} from '../lib/localization';
const operationalAreas=[
  {key:"fundraising",en:"Fundraising & Production",he:"גיוס כספים וייצור",detailEn:"Print products, filament, event sales and income",detailHe:"מוצרי הדפסה, פילמנט, מכירות באירועים והכנסות",path:"/fundraising"},
  {key:"inventory",en:"Tools & inventory",he:"כלים ומלאי",detailEn:"Parts, equipment, stock and purchase requests",detailHe:"חלקים, ציוד, מלאי ובקשות רכש",path:"/tools"},
  {key:"decisions",en:"Decision log",he:"יומן החלטות",detailEn:"Technical decisions and rationale",detailHe:"החלטות טכניות והסיבות להן"},
  {key:"packing",en:"Pit & packing",he:"פיט ואריזה",detailEn:"Competition packing and readiness",detailHe:"אריזה לתחרות ומוכנות"},
  {key:"assignments",en:"Assignments",he:"שיבוצים",detailEn:"Event and workshop roles",detailHe:"תפקידי אירוע וסדנה"},
] as const;

export default function TeamOperationsPage(){
 const navigate=useNavigate(),{pick}=useLocalization();
 return <main className="hub-page work-command-center"><header className="hub-page-header"><div><div className="hub-eyebrow">G3 6740</div><h1>{pick('Team operations','תפעול הקבוצה')}</h1><p>{pick('Shared resources, fundraising and coordination. Your personal assignments remain in Work.','משאבים משותפים, גיוס כספים ותיאום. המשימות האישיות נמצאות בעבודה.')}</p></div></header><section className="work-destination-section"><div className="work-destination-grid">{operationalAreas.map(area=><button key={area.key} onClick={()=>navigate('path' in area?area.path:'/frc-operations?area='+area.key)}><span>{area.key==='inventory'?'STOCK':'G3'}</span><strong>{pick(area.en,area.he)}</strong><small>{pick(area.detailEn,area.detailHe)}</small><b>→</b></button>)}<button onClick={()=>navigate('/season-planning')}><span>PLAN</span><strong>{pick('Season roadmap','מפת העונה')}</strong><small>{pick('Milestones, dependencies and engineering decisions','אבני דרך, תלויות והחלטות הנדסיות')}</small><b>→</b></button></div></section></main>;
}
