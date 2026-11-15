type EnrollmentInput={native:boolean;action:string;saved:boolean;attendanceId?:string;memberId?:string;token?:string;isCurrent?:()=>boolean};
type EnrollmentPort={preference(args:{memberId:string}):Promise<{enabled:boolean}>;status():Promise<{permission:boolean}>;arm(args:{attendanceId:string;memberId:string;token:string}):Promise<{state:string;mode:string}>};
export type EnrollmentResult='skipped'|'active'|'observe'|'permission'|'failed';
// Called only by the successful native check-in response, never by page load or a restored session.
export async function enrollAfterCheckIn(input:EnrollmentInput,port:EnrollmentPort):Promise<EnrollmentResult>{
 if(!input.native||input.action!=='check_in'||!input.saved)return 'skipped';
 const {attendanceId,memberId,token}=input;
 if(!attendanceId||!memberId||!token)return 'failed';
 try{
  if(input.isCurrent?.()===false)return 'skipped';
  if(!(await port.preference({memberId})).enabled)return 'skipped';
  if(!(await port.status()).permission)return 'permission';
  if(input.isCurrent?.()===false)return 'skipped';
  const result=await port.arm({attendanceId,memberId,token});
  if(result.state!=='armed')return 'failed';
  return result.mode==='enforce'?'active':'observe';
 }catch{return 'failed';} // An enrollment failure must never undo/retry a saved attendance.
}
