import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {supabase} from '../supabase';
import {academyText} from '../lib/academyLanguage';
import {useLocalization} from '../lib/localization';
export default function RelatedLearning({query}:{query:string}){
 const {pick}=useLocalization();const [courses,setCourses]=useState<{id:string;title:string;description:string;domain:string}[]>([]);
 useEffect(()=>{let live=true;void supabase.from('training_courses').select('id,title,description,domain').eq('active',true).then(({data,error})=>{if(live&&!error)setCourses(data??[]);});return()=>{live=false;};},[]);
 const terms=query.toLocaleLowerCase().trim().split(/\s+/).filter(t=>t.length>1);
 const matches=terms.length?courses.map(c=>({c,score:terms.filter(t=>`${c.title} ${c.description} ${c.domain}`.toLocaleLowerCase().includes(t)).length})).filter(r=>r.score>0).sort((a,b)=>b.score-a.score).slice(0,3):[];
 if(!matches.length)return null;
 return <aside className="academy-related"><h3>{pick('Practice this skill','תרגול המיומנות')}</h3><p>{pick('Related learning · separate from source evidence. Opening a course does not enroll you.','למידה קשורה · בנפרד ממקורות ראיה. פתיחת קורס אינה רושמת אתכם אליו.')}</p>{matches.map(({c})=><Link key={c.id} to={'/growth?'+new URLSearchParams({course:c.id,view:c.id.startsWith('67402026-1002-')?'practical':'content'})}>{academyText(c.title,pick)} →</Link>)}</aside>;
}
