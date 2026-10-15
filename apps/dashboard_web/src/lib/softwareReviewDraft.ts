import type {SoftwareSelection} from '../components/SoftwareMentorContext';
import type {EvidencePreview} from '../components/SoftwareEvidencePreview';
import {supabase} from '../supabase';
export const softwareReviewDraftKey=(id:string)=>'g3-software-review-draft:'+id;
export type SoftwareReviewDraft={selection:SoftwareSelection;question:string;changes?:{path:string;status:string}[];preview?:EvidencePreview;draftRevision?:number};
export async function loadSoftwareReviewDraft(memberId:string):Promise<SoftwareReviewDraft|null>{
 const r=await supabase.from('software_review_drafts').select('draft,revision').eq('member_id',memberId).maybeSingle();
 if(r.error)throw r.error;return r.data?{...r.data.draft,draftRevision:r.data.revision}:null;
}
export async function saveSoftwareReviewDraft(draft:SoftwareReviewDraft){
 // Do not persist provider credentials or source blobs in draft metadata.
 const r=await supabase.rpc('save_software_review_draft',{p_draft:{selection:draft.selection,question:draft.question,changes:(draft.changes??[]).slice(0,200)},p_revision:draft.draftRevision??0});
 if(r.error)throw r.error;return Number(r.data);
}
