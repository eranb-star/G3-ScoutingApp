export function israelLocalTime(value:string){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jerusalem',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(value)).map(p=>[p.type,p.value]));
 return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}
export function israelTimeToUtc(value:string){
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))throw Error('Enter a valid date and time');
 const naive=Date.parse(value+'Z');
 // Validate candidate offsets through Intl rather than assuming summer/winter dates.
 const matches=[120,180].map(offset=>new Date(naive-offset*60000).toISOString()).filter(candidate=>israelLocalTime(candidate)===value);
 if(matches.length!==1)throw Error('This Israel time is ambiguous or does not exist because of the clock change. Choose an unambiguous time.');
 return matches[0];
}
