import { useEffect, useState } from 'react';
import { endQaTest, startQaTest, supabase, returnToAdminLocally } from '../supabase';
import { getQaTestSession } from '../lib/qaTestSession';

type Account = { id: string; display_name: string; role: string };
export function QaTestAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  useEffect(() => { void supabase.rpc('available_qa_test_accounts').then(({ data, error }) => {
    if (error) setError('QA switching needs the database update before it can be used.');
    else setAccounts(data || []);
  }); }, []);
  async function start(id: string) {
    setBusy(true); setError('');
    try { await startQaTest(id); } catch (e) { setError((e as Error).message); setBusy(false); }
  }
  return <section className="hub-card settings-section"><h2>Test as a QA user</h2><p>Use the QA account’s actual permissions. Changes affect team data: use test projects and requests.</p><div className="qa-account-buttons">{accounts.map(account => <button type="button" className="hub-button" key={account.id} disabled={busy} onClick={() => void start(account.id)}>Test as {account.display_name}</button>)}</div>{!accounts.length && !error ? <p>No active QA accounts available.</p> : null}{error ? <p role="alert">{error}</p> : null}</section>;
}

export function QaTestBanner() {
  const test = getQaTestSession();
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 15000); return () => window.clearInterval(timer); }, []);
  if (!test) return null;
  async function finish() {
    setBusy(true); setError('');
    try { await endQaTest(); } catch (e) { setError((e as Error).message); setBusy(false); }
  }
  return <aside className="qa-test-banner" aria-label="QA testing session"><div><strong>Testing as {test.displayName}</strong><span>{now >= Date.parse(test.expiresAt) ? 'QA session expired. Return to admin to start again.' : 'QA account · Changes affect team data'}</span>{error ? <><span role="alert">{error}</span><button type="button" className="button-secondary" onClick={returnToAdminLocally}>Return locally — server sign-out unconfirmed</button></> : null}</div><button type="button" className="hub-button" disabled={busy} onClick={() => void finish()}>{busy ? 'Returning…' : 'Return to admin'}</button></aside>;
}
