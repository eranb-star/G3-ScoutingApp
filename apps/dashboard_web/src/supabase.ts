import { createClient } from "@supabase/supabase-js";
import { getQaTestSession, QA_AUTH_KEY, QA_META_KEY, type QaTestSession } from './lib/qaTestSession';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anon) {
  // This prevents “silent failure” when env vars are missing.
  // Open your browser console to see it.
  console.error("Missing Supabase env vars. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env");
}

const qa = getQaTestSession();
const qaAuth = { storage: sessionStorage, storageKey: QA_AUTH_KEY, autoRefreshToken: false, detectSessionInUrl: false };
export const supabase = createClient(url, anon, qa ? { auth: qaAuth, global: { fetch: (input, init) => {
  if (Date.now() >= Date.parse(qa.expiresAt)) return Promise.reject(new Error('QA session expired. Return to admin to start again.'));
  return fetch(input, init);
} } } : undefined);

export async function startQaTest(targetId: string) {
  const { data, error } = await supabase.functions.invoke('qa-test-session', { body: { action: 'start', targetId } });
  if (error || data?.error) throw new Error(data?.error || 'QA sign-in unavailable. Check that the QA SQL and Edge Function are deployed.');
  const isolated = createClient(url, anon, { auth: qaAuth });
  try {
    const result = await isolated.auth.setSession(data.session);
    if (result.error) throw result.error;
    sessionStorage.setItem(QA_META_KEY, JSON.stringify(data.test as QaTestSession));
  } catch (error) {
    await supabase.functions.invoke('qa-test-session', { body: { action: 'end', id: data.test.id, qaToken: data.session.access_token } });
    sessionStorage.removeItem(QA_AUTH_KEY);
    throw error;
  }
  window.location.replace('/home');
}

export async function endQaTest() {
  const test = getQaTestSession();
  // The normal admin storage key was never replaced. It also permits ending an expired QA session.
  const admin = createClient(url, anon);
  const stored = JSON.parse(sessionStorage.getItem(QA_AUTH_KEY) || '{}');
  const { data, error } = await admin.functions.invoke('qa-test-session', { body: { action: 'end', id: test?.id, qaToken: stored.access_token } });
  if (error || data?.error) throw new Error('Could not end the QA session. Check your connection and try again.');
  returnToAdminLocally();
}

export function returnToAdminLocally() {
  supabase.auth.stopAutoRefresh();
  sessionStorage.removeItem(QA_AUTH_KEY);
  sessionStorage.removeItem(QA_META_KEY);
  window.location.replace('/settings');
}
