import 'dotenv/config';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TBA_KEY = process.env.TBA_AUTH_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !TBA_KEY) {
  console.error('Missing env vars. Copy .env.example to .env and fill values.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function tbaGet(path) {
  const res = await fetch(`https://www.thebluealliance.com/api/v3${path}`, {
    headers: { 'X-TBA-Auth-Key': TBA_KEY },
  });
  if (!res.ok) throw new Error(`TBA error ${res.status}: ${await res.text()}`);
  return res.json();
}

async function upsertEvent(tbaEventKey) {
  const ev = await tbaGet(`/event/${tbaEventKey}`);
  const payload = {
    tba_event_key: tbaEventKey,
    name: ev.name ?? tbaEventKey,
    location: ev.location_name ?? ev.city ?? null,
    start_date: ev.start_date ?? null,
    end_date: ev.end_date ?? null,
    active: true,
  };

  const { data, error } = await supabase
    .from('events')
    .upsert(payload, { onConflict: 'tba_event_key' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function importTeams(eventId, tbaEventKey) {
  const teams = await tbaGet(`/event/${tbaEventKey}/teams/simple`);
  const rows = teams.map(t => ({
    event_id: eventId,
    team_number: t.team_number,
    team_name: t.nickname ?? t.name ?? null,
    tba_team_key: t.key,
    meta: t,
  }));

  await supabase.from('teams').delete().eq('event_id', eventId);
  const { error } = await supabase.from('teams').insert(rows);
  if (error) throw error;
  console.log(`Inserted ${rows.length} teams`);
}

async function importMatches(eventId, tbaEventKey) {
  const matches = await tbaGet(`/event/${tbaEventKey}/matches/simple`);
  const rows = matches.map(m => {
    const mk = m.key?.split('_')?.[1] ?? String(m.match_number ?? 'unknown');
    const red = (m.alliances?.red?.team_keys ?? []).map(k => parseInt(k.replace('frc',''),10));
    const blue = (m.alliances?.blue?.team_keys ?? []).map(k => parseInt(k.replace('frc',''),10));
    return {
      event_id: eventId,
      match_key: mk,
      match_type: mk.startsWith('qm') ? 'qm' : 'playoff',
      match_number: m.match_number ?? null,
      scheduled_time: m.time ? new Date(m.time*1000).toISOString() : null,
      red_teams: red,
      blue_teams: blue,
      result: null
    };
  });

  await supabase.from('matches').delete().eq('event_id', eventId);
  const { error } = await supabase.from('matches').insert(rows);
  if (error) throw error;
  console.log(`Inserted ${rows.length} matches`);
}

async function main() {
  const tbaEventKey = process.argv[2];
  if (!tbaEventKey) {
    console.error('Usage: node import_tba.js <tba_event_key>  e.g. 2026isde1');
    process.exit(1);
  }

  const ev = await upsertEvent(tbaEventKey);
  console.log(`Event upserted: ${ev.name} (${ev.id})`);
  await importTeams(ev.id, tbaEventKey);
  await importMatches(ev.id, tbaEventKey);
  console.log('Done ✅');
}

main().catch(e => { console.error(e); process.exit(1); });
