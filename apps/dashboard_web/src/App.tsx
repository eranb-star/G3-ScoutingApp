import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase';

type EventRow = { id: string; name: string; };
type TeamRow = { team_number: number; team_name?: string | null; };
type EntryRow = { team_number: number; data: any; };

function computeTeamMetrics(entries: EntryRow[]) {
  const n = Math.max(entries.length, 1);
  let autoSucc = 0, autoFail = 0, cycles = 0;
  let relSum = 0;
  const outputs: number[] = [];

  for (const e of entries) {
    const d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
    autoSucc += d.autoScore ?? 0;
    autoFail += d.autoFail ?? 0;
    cycles += d.cycles ?? 0;

    let r = 1.0;
    if (d.died) r -= 0.6;
    if (d.brownout) r -= 0.3;
    if (d.commsIssue) r -= 0.2;
    relSum += Math.max(0, Math.min(1, r));

    outputs.push(d.outputScore ?? ((d.autoScore ?? 0) + (d.scoreSuccess ?? 0)));
  }

  const autoRate = autoSucc / (autoSucc + autoFail + 1e-9);
  const avgOutput = outputs.reduce((a,b)=>a+b,0) / n;
  const variance = outputs.reduce((a,b)=>a + (b-avgOutput)*(b-avgOutput), 0) / n;
  const stdDev = Math.sqrt(variance);
  const consistency = 1 / (1 + stdDev);
  const reliability = relSum / n;
  const avgCycles = cycles / n;

  return { avgOutput, autoRate, avgCycles, reliability, consistency };
}

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [eventId, setEventId] = useState('');
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [entries, setEntries] = useState<EntryRow[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_ev, sess) => setSession(sess));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    (async () => {
      const { data, error } = await supabase.from('events').select('id,name').order('created_at', { ascending: false });
      if (!error && data) setEvents(data as any);
    })();
  }, [session]);

  useEffect(() => {
    if (!session || !eventId) return;
    (async () => {
      const t = await supabase.from('teams').select('team_number,team_name').eq('event_id', eventId);
      const e = await supabase.from('scout_entries').select('team_number,data').eq('event_id', eventId);
      if (!t.error && t.data) setTeams(t.data as any);
      if (!e.error && e.data) setEntries(e.data as any);
    })();
  }, [session, eventId]);

  const metricsByTeam = useMemo(() => {
    const grouped = new Map<number, EntryRow[]>();
    for (const en of entries) {
      if (!grouped.has(en.team_number)) grouped.set(en.team_number, []);
      grouped.get(en.team_number)!.push(en);
    }
    const map = new Map<number, ReturnType<typeof computeTeamMetrics>>();
    for (const [team, list] of grouped.entries()) map.set(team, computeTeamMetrics(list));
    return map;
  }, [entries]);

  if (!session) return <Login />;

  return (
    <div style={{ padding: 16, fontFamily: 'system-ui' }}>
      <h2>G3 Dashboard (Starter)</h2>

      <div style={{ display:'flex', gap: 12, alignItems:'center' }}>
        <label>Event:</label>
        <select value={eventId} onChange={(e)=>setEventId(e.target.value)}>
          <option value="">Select...</option>
          {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
        </select>
        <button onClick={() => supabase.auth.signOut()}>Sign out</button>
      </div>

      {eventId && (
        <>
          <h3 style={{ marginTop: 16 }}>Teams (sorted by AvgOutput)</h3>
          <table border={1} cellPadding={6} style={{ borderCollapse:'collapse', width:'100%' }}>
            <thead>
              <tr>
                <th>Team</th>
                <th>Name</th>
                <th>AvgOutput</th>
                <th>AutoRate</th>
                <th>AvgCycles</th>
                <th>Reliability</th>
                <th>Consistency</th>
              </tr>
            </thead>
            <tbody>
              {teams
                .slice()
                .sort((a,b) => (metricsByTeam.get(b.team_number)?.avgOutput ?? 0) - (metricsByTeam.get(a.team_number)?.avgOutput ?? 0))
                .map(t => {
                  const m = metricsByTeam.get(t.team_number);
                  return (
                    <tr key={t.team_number}>
                      <td>{t.team_number}</td>
                      <td>{t.team_name ?? ''}</td>
                      <td>{m ? m.avgOutput.toFixed(2) : ''}</td>
                      <td>{m ? (m.autoRate*100).toFixed(1)+'%' : ''}</td>
                      <td>{m ? m.avgCycles.toFixed(2) : ''}</td>
                      <td>{m ? m.reliability.toFixed(2) : ''}</td>
                      <td>{m ? m.consistency.toFixed(2) : ''}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

function Login() {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState('');

  return (
    <div style={{ padding: 16, fontFamily:'system-ui' }}>
      <h2>Login</h2>
      <div style={{ display:'grid', gap: 8, maxWidth: 360 }}>
        <input placeholder="email" value={email} onChange={(e)=>setEmail(e.target.value)} />
        <input placeholder="password" type="password" value={pw} onChange={(e)=>setPw(e.target.value)} />
        <button onClick={async ()=>{
          setMsg('');
          const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
          if (error) setMsg(error.message);
        }}>Sign in</button>
        {msg && <div style={{ color:'crimson' }}>{msg}</div>}
        <small>Set VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY in .env</small>
      </div>
    </div>
  );
}
