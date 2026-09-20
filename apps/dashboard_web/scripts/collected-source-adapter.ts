import type {CollectedSourceSearch} from '../src/lib/collectedSources';

// Preview-only adapter. Never bundled into the production application.
export const searchCollectedSources:CollectedSourceSearch=async(filters,page,signal)=>{
 const params=new URLSearchParams({q:filters.query,topics:filters.topics.join(','),years:filters.seasons.join(','),match:filters.mode,page:String(page)});
 const response=await fetch('/__collection/search?'+params,{signal});
 if(!response.ok)throw new Error('Collected source search unavailable');
 return {...await response.json(),generation:'local-review-only'};
};
