// Experimental text-only adapter. Activation still requires the execution/
// purpose coordinator and hosted acceptance. Never fall back to unmetered calls.
type Rpc = (name: string, args: Record<string, unknown>) => PromiseLike<{data: any; error: any}>;
type Options = {
  rpc: Rpc; memberId: string; requestId: string; apiKey: string;
  prompt: string; systemInstruction: string; signal?: AbortSignal;
  step?: 'scope:0' | 'answer:0';
};
export class BudgetExecutionError extends Error {
  constructor(public code: string, public status = 503) { super(code); }
}
// Standard pricing, verified 2026-09-20. No cache discount assumptions.
// https://ai.google.dev/gemini-api/docs/pricing#gemini-3.6-flash
export const PRICE = Object.freeze({model:'gemini-3.6-flash',version:'gemini-3.6-standard-20260920',
  validFrom:Date.parse('2026-09-20T00:00:00Z'),validUntil:Date.parse('2026-10-20T00:00:00Z'),
  inputQuarterMicros:3,outputQuarterMicros:15,maxInput:1048576,maxOutput:2000});
const integer=(n: unknown): n is number => typeof n==='number' && Number.isSafeInteger(n) && n>=0;
export function costMicros(input: number, output: number): number {
  if(!integer(input)||!integer(output)) throw new BudgetExecutionError('INVALID_USAGE');
  const total=BigInt(input)*BigInt(PRICE.inputQuarterMicros)+BigInt(output)*BigInt(PRICE.outputQuarterMicros);
  const result=Number((total+3n)/4n);
  if(!Number.isSafeInteger(result)) throw new BudgetExecutionError('INVALID_USAGE');
  return result;
}
export async function executeBudgetedText(options: Options, dependencies: {fetch?:typeof fetch;now?:()=>number}={}) {
  const now=dependencies.now??Date.now, send=dependencies.fetch??fetch;
  if(now()<PRICE.validFrom || now()>=PRICE.validUntil) throw new BudgetExecutionError('PRICE_REVIEW_REQUIRED');
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(options.requestId)) throw new BudgetExecutionError('REQUEST_ID_REQUIRED',400);
  if(!options.apiKey || typeof options.prompt!=='string' || !options.prompt.trim()
    || typeof options.systemInstruction!=='string') throw new BudgetExecutionError('INVALID_TEXT_REQUEST',400);
  if(new TextEncoder().encode(options.prompt+options.systemInstruction).byteLength>64000) throw new BudgetExecutionError('CONTEXT_TOO_LARGE',400);
  if(options.signal?.aborted) throw new BudgetExecutionError('CANCELLED',409);
  const step=options.step??'answer:0';
  if(!['scope:0','answer:0'].includes(step)) throw new BudgetExecutionError('INVALID_STEP',400);
  const maxOutput=step==='scope:0'?512:PRICE.maxOutput;
  const body={contents:[{role:'user',parts:[{text:options.prompt}]}],
    systemInstruction:{parts:[{text:options.systemInstruction}]},
    generationConfig:{candidateCount:1,maxOutputTokens:maxOutput}};
  const serialized=JSON.stringify(body);
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(serialized));
  const hash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  const rpc=async(name:string,args:Record<string,unknown>)=>{
    const result=await options.rpc(name,args);
    if(result.error) {
      const code=String(result.error.message??'');
      for(const limit of ['TEAM_DAILY_BUDGET_EXHAUSTED','MEMBER_DAILY_BUDGET_EXHAUSTED','PURPOSE_BUDGET_EXHAUSTED','EXECUTION_BUDGET_EXHAUSTED','PROVIDER_COOLDOWN','PROVIDER_RATE_LIMIT'])
        if(code.includes(limit))throw new BudgetExecutionError(limit,429);
      if(code.includes('TEAM_MONTHLY_BUDGET_EXHAUSTED')) throw new BudgetExecutionError('TEAM_MONTHLY_BUDGET_EXHAUSTED',429);
      if(code.includes('ASSIST_ACCESS_DENIED')) throw new BudgetExecutionError('ASSIST_ACCESS_DENIED',403);
      if(code.includes('IDEMPOTENCY_CONFLICT')) throw new BudgetExecutionError('IDEMPOTENCY_CONFLICT',409);
      throw new BudgetExecutionError('BUDGET_SERVICE_UNAVAILABLE');
    }
    return result.data;
  };
  // Reserve the provider's documented maximum input, rather than pretending
  // countTokens estimates are guaranteed exact. Unused funds settle afterward.
  // This deliberately over-reserves (~$0.794); tighter admission is future work.
  const attempt=await rpc('reserve_g3_assist_budget',{p_member:options.memberId,p_request:options.requestId,
    p_step:step,p_hash:hash,p_price_version:PRICE.version,p_provider:'gemini',p_model:PRICE.model,
    p_max_microusd:costMicros(PRICE.maxInput,maxOutput)});
  if(!attempt?.id || attempt.state!=='reserved') throw new BudgetExecutionError('REQUEST_ALREADY_PROCESSED',409);
  const controller=new AbortController();
  const abort=()=>controller.abort();
  options.signal?.addEventListener('abort',abort,{once:true});
  const timer=setTimeout(abort,45000);
  let ownsDispatch=false;
  // Never stop another worker's reservation after losing its dispatch claim.
  const uncertain=async()=>{if(ownsDispatch) await rpc('stop_g3_assist_budget',{p_attempt:attempt.id});};
  try {
    if(options.signal?.aborted) controller.abort();
    if(controller.signal.aborted) throw new BudgetExecutionError('CANCELLED',409);
    const endpoint=`https://generativelanguage.googleapis.com/v1beta/models/${PRICE.model}`;
    const headers={'Content-Type':'application/json','x-goog-api-key':options.apiKey};
    const counted=await send(`${endpoint}:countTokens`,{method:'POST',headers,signal:controller.signal,
      body:JSON.stringify({generateContentRequest:{...body,model:`models/${PRICE.model}`}})});
    if(!counted.ok) throw new BudgetExecutionError('TOKEN_COUNT_UNAVAILABLE');
    const count=await counted.json();
    if(!integer(count.totalTokens)||count.totalTokens>16000) throw new BudgetExecutionError('CONTEXT_TOO_LARGE',400);
    if(controller.signal.aborted) throw new BudgetExecutionError('CANCELLED',409);
    // Only this TRUE grants permission to issue the paid network operation.
    ownsDispatch=await rpc('dispatch_g3_assist_budget',{p_attempt:attempt.id})===true;
    if(!ownsDispatch) throw new BudgetExecutionError('DISPATCH_NOT_AUTHORIZED',409);
    if(controller.signal.aborted) throw new BudgetExecutionError('CANCELLED',409);
    const response=await send(`${endpoint}:generateContent`,{method:'POST',headers,body:serialized,signal:controller.signal});
    if(!response.ok) throw new BudgetExecutionError(response.status===429?'PROVIDER_QUOTA':'PROVIDER_UNAVAILABLE',response.status===429?429:503);
    const payload=await response.json();
    const usage=payload.usageMetadata;
    // Missing counters are unknown, not zero. Do not refund an uncertain charge.
    if(!usage || !integer(usage.promptTokenCount)||!integer(usage.candidatesTokenCount)
      || !integer(usage.thoughtsTokenCount)||!integer(usage.totalTokenCount)
      || (usage.toolUsePromptTokenCount??0)!==0 || typeof payload.responseId!=='string' || !payload.responseId
      || usage.totalTokenCount!==usage.promptTokenCount+usage.candidatesTokenCount+usage.thoughtsTokenCount)
      throw new BudgetExecutionError('USAGE_RECONCILIATION_REQUIRED');
    const actual=costMicros(usage.promptTokenCount,usage.candidatesTokenCount+usage.thoughtsTokenCount);
    const settled=await rpc('settle_g3_assist_budget',{p_attempt:attempt.id,p_actual_microusd:actual,p_provider_request_id:payload.responseId});
    if(settled!=='settled') throw new BudgetExecutionError('BUDGET_REVIEW_REQUIRED');
    const candidate=payload.candidates?.[0];
    if(payload.candidates?.length!==1 || candidate.finishReason!=='STOP') throw new BudgetExecutionError('ANSWER_INCOMPLETE',502);
    const answer=(candidate.content?.parts??[]).filter((p:any)=>!p.thought&&typeof p.text==='string').map((p:any)=>p.text).join('\n').trim();
    if(!answer) throw new BudgetExecutionError('ANSWER_EMPTY',502);
    return {answer,model:PRICE.model,attemptId:attempt.id,actualMicrousd:actual,
      usage:{inputTokens:usage.promptTokenCount,outputTokens:usage.candidatesTokenCount,thoughtTokens:usage.thoughtsTokenCount}};
  } catch(error) {
    await uncertain(); // A failed settlement leaves its original hold intact.
    if(error instanceof BudgetExecutionError) throw error;
    throw new BudgetExecutionError(controller.signal.aborted?'CANCELLED':'PROVIDER_UNAVAILABLE',controller.signal.aborted?409:503);
  } finally {
    clearTimeout(timer); options.signal?.removeEventListener('abort',abort);
    // Before claiming dispatch, leave a possibly shared reservation untouched.
    // Its safe expiry/reconciliation must be handled by the coordinator.
  }
}
