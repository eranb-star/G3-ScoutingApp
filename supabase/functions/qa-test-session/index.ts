import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Cache-Control': 'no-store', 'Content-Type': 'application/json' };
const allowed: Record<string, string> = {
  'qa.student.20260905@g3-test.invalid': 'member',
  'qa.mentor.20260905@g3-test.invalid': 'mentor',
  'qa.leader.20260905@g3-test.invalid': 'team_leader',
};
function claims(token: string) {
  const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(atob(part));
}
Deno.serve(async (request: Request) => {
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
  if (request.method === 'OPTIONS') return new Response('ok', { headers });
  if (request.method !== 'POST') return reply({ error: 'POST required' }, 405);
  const url = Deno.env.get('SUPABASE_URL')!, anon = Deno.env.get('SUPABASE_ANON_KEY')!;
  const service = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
  const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const { data: caller, error: authError } = await service.auth.getUser(token);
  if (authError || !caller.user) return reply({ error: 'Sign in required' }, 401);
  try {
    const body = await request.json();
    const { data: admin } = await service.from('team_members').select('role,active').eq('id', caller.user.id).single();
    if (body.action === 'end') {
      const { data: test } = await service.from('qa_test_sessions').select('*').eq('id', body.id).single();
      const isOwner = admin?.active && admin.role === 'admin' && test?.administrator_id === caller.user.id;
      const isQa = test?.target_id === caller.user.id && test?.auth_session_id === claims(token).session_id;
      if (!test || (!isOwner && !isQa)) return reply({ error: 'Not permitted' }, 403);
      if (isQa) await service.auth.admin.signOut(token, 'local');
      if (isOwner && typeof body.qaToken === 'string') {
        const { data: qaUser } = await service.auth.getUser(body.qaToken);
        if (qaUser.user?.id === test.target_id && claims(body.qaToken).session_id === test.auth_session_id) await service.auth.admin.signOut(body.qaToken, 'local');
      }
      const { error } = await service.from('qa_test_sessions').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', test.id);
      if (error) throw error;
      return reply({ ok: true });
    }
    if (body.action !== 'start' || !admin?.active || admin.role !== 'admin') return reply({ error: 'Administrator required' }, 403);
    const { data: designation } = await service.from('qa_test_accounts').select('*').eq('member_id', body.targetId).eq('enabled', true).single();
    if (!designation || allowed[designation.email] !== designation.expected_role) return reply({ error: 'Designated QA accounts only' }, 403);
    const { data: member } = await service.from('team_members').select('id,email,role,active,display_name').eq('id', body.targetId).single();
    const { data: identity } = await service.auth.admin.getUserById(body.targetId);
    if (!member?.active || member.role !== designation.expected_role || member.email?.toLowerCase() !== designation.email || identity.user?.email?.toLowerCase() !== designation.email) return reply({ error: 'QA account identity does not match' }, 403);
    const { data: link, error: linkError } = await service.auth.admin.generateLink({ type: 'magiclink', email: designation.email });
    if (linkError || !link.properties?.hashed_token) throw new Error('QA sign-in could not be created');
    const verifier = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: signed, error: verifyError } = await verifier.auth.verifyOtp({ type: 'magiclink', token_hash: link.properties.hashed_token });
    if (verifyError || !signed.session || signed.user?.id !== member.id) throw new Error('QA sign-in failed');
    const session = signed.session, jwt = claims(session.access_token);
    const expiresAt = new Date(jwt.exp * 1000).toISOString();
    const { data: test, error: auditError } = await service.from('qa_test_sessions').insert({ administrator_id: caller.user.id, target_id: member.id, auth_session_id: jwt.session_id, expires_at: expiresAt, status: 'active' }).select('id').single();
    if (auditError || !test) {
      await service.auth.admin.signOut(session.access_token, 'local');
      throw new Error('QA audit could not be saved');
    }
    return reply({ session: { access_token: session.access_token, refresh_token: session.refresh_token }, test: { id: test.id, targetId: member.id, displayName: member.display_name, role: member.role, expiresAt } });
  } catch { return reply({ error: 'QA session request failed. Check the database setup and function logs.' }, 400); }
});
