// Offline, reproducible coverage accounting. No network or database writes.
import fs from 'node:fs';
const root = new URL('./', import.meta.url);
const read = p => JSON.parse(fs.readFileSync(new URL(p, root), 'utf8'));
const jobs = read('full-collection/jobs.json');
const scope = read('full-collection/scope.json');
const measurement = read('isolated-corpus/measurement.json');
const bundle = read('isolated-corpus/bundle.json');
const indexedUrls = new Set(bundle.sources.map(s => s.url));
const key = a => `${a.year}:${a.team}`;
const associations = new Map();
for (const job of jobs) for (const a of job.associations) {
  if (!associations.has(key(a))) associations.set(key(a), []);
  associations.get(key(a)).push(job);
}
const entries = scope.teamSeasons.map(row => {
  const found = associations.get(key(row)) || [];
  return {...row, status: found.some(j => indexedUrls.has(j.url)) ? 'source-text-indexed-unreviewed' : found.some(j => j.status === 'collected') ? 'source-downloaded' : found.length ? 'source-discovered' : 'source-not-discovered',
    candidateTopics: found.map(j => j.topic), downloadedTopics: found.filter(j => j.status === 'collected').map(j => j.topic)};
});
const supplemental = [...associations].filter(([id]) => !entries.some(e => key(e) === id)).map(([id, rows]) => ({teamSeason:id, topics:rows.map(j=>j.topic), downloadedTopics:rows.filter(j=>j.status==='collected').map(j=>j.topic)}));
const seasons = scope.seasons.map(s => {
  const rows = jobs.flatMap(j => j.associations.filter(a => a.year === s.year).map(a => ({...a, downloaded:j.status === 'collected', indexed:indexedUrls.has(j.url)})));
  return {...s, candidateTeamSeasons:new Set(rows.map(r=>r.team)).size,
    downloadedTeamSeasons:new Set(rows.filter(r=>r.downloaded).map(r=>r.team)).size,
    indexedTeamSeasons:new Set(rows.filter(r=>r.indexed).map(r=>r.team)).size,
    selectedWithoutDiscoveredSources:entries.filter(e=>e.year===s.year&&e.status==='source-not-discovered').length};
});
const report = {generatedAt:new Date().toISOString(),targetPerRankedSeason:500,
  selectionMeaning:'Archived ranking snapshots where available. Source-title associations are candidates, not verified robot facts.',
  selectedTeamSeasons:entries.length,seasons,
  threads:jobs.length,statuses:jobs.reduce((a,j)=>(a[j.status]=(a[j.status]||0)+1,a),{}),
  publicPostsCollected:jobs.reduce((n,j)=>n+(j.posts||0),0),
  rankedTeamSeasonsWithSources:entries.filter(e=>e.candidateTopics.length).length,
  rankedTeamSeasonsWithoutDiscoveredSources:entries.filter(e=>!e.candidateTopics.length).length,
  supplementalTeamSeasons:supplemental.length,
  discovery:read('full-collection/discovery-progress.json'),measurement,
  missingRankingYears:seasons.filter(s=>s.status==='ranking-unavailable').map(s=>s.year),
  unrankedExceptionYears:seasons.filter(s=>s.status==='unranked-exception').map(s=>s.year),
  limitations:['Not an exhaustive internet catalogue. Titles require attribution review.',
    'Downloaded post text excludes linked file contents, images, video and CAD unless separately collected.',
    'Local indexed relation bytes exclude production schema, WAL, backups and original-file storage.',
    'Searchable mentions are not verified robot mechanisms. No production import or deployment.']};
fs.writeFileSync(new URL('full-collection/coverage.json',root),JSON.stringify({report,ranked:entries,supplemental},null,2));
fs.writeFileSync(new URL('collection-progress-20260920.json',root),JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
