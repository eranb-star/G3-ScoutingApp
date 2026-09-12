type QueueGate = {reviewer_id:string;reviewer_ids?:string[];submission:null|{status:string;submitted_by?:string;required_reviewers?:string[];reviewer_decisions?:Record<string,{decision:string}>}};

export function needsReview(gate:QueueGate, memberId:string, includePlanned=false){
 const submission=gate.submission;
 const reviewers=submission?.required_reviewers?.length?submission.required_reviewers:gate.reviewer_ids?.length?gate.reviewer_ids:[gate.reviewer_id];
 if(!reviewers.includes(memberId)||submission?.submitted_by===memberId)return false;
 if(!submission)return includePlanned;
 return submission.status==='pending'&&submission.reviewer_decisions?.[memberId]?.decision!=='approved';
}
