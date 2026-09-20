import fs from 'node:fs';
import {PGlite} from '../../../docs/staging/ops-qa/node_modules/@electric-sql/pglite/dist/index.js';
const dir = new URL('../../../docs/research/full-collection/', import.meta.url);
const bundlePath = new URL('../../../docs/research/isolated-corpus/bundle.json', import.meta.url);
const read = (name, fallback) => fs.existsSync(new URL(name, dir)) ? JSON.parse(fs.readFileSync(new URL(name, dir), 'utf8')) : fallback;

export function collectionReviewPlugin(getTopics) {
  let dbPromise, dbStamp;
  let searchPending = Promise.resolve();
  const database = async () => {
    const stamp = fs.statSync(bundlePath).mtimeMs;
    if (dbPromise && stamp === dbStamp) return dbPromise;
    if (dbPromise) await (await dbPromise).db.close();
    dbStamp = stamp;
    dbPromise = (async () => {
    const db = new PGlite();
    const bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));
    const indexedAt = fs.statSync(bundlePath).mtime.toISOString();
    await db.exec(`create table documents(id integer primary key,url text,title text,seasons integer[],source_class text,scope text);
      create table passages(hash text primary key,body text,search tsvector generated always as(to_tsvector('english',body)) stored);
      create table citations(id bigint generated always as identity primary key,document integer references documents(id),url text,hash text references passages(hash));begin`);
    const sources = new Map(bundle.sources.map(s => [s.id, s]));
    for (const s of bundle.sources) {
      const contextYears = [...new Set(s.candidateAssociations?.map(a => a.year) || [s.documentSeason ?? s.sourceContextSeason ?? s.citingSeason].filter(Boolean))];
      const parsed = new URL(s.url);
      const fallbackTitle = parsed.pathname.startsWith('/t/') ? parsed.pathname.split('/')[2].replaceAll('-', ' ') : parsed.hostname;
      const official = ['official-manual','official-technical-doc'].includes(s.kind) || (s.kind === 'engineering-reference' && ['docs.wpilib.org','frc-docs.readthedocs.io'].includes(parsed.hostname));
      const sourceClass = official ? 'official' : ['forum-thread','team-release','technical-binder'].includes(s.kind) || s.publisherTeam ? 'team' : 'other';
      await db.query('insert into documents values($1,$2,$3,$4,$5,$6)', [s.id, s.url, s.title || fallbackTitle, contextYears, sourceClass, s.scope || null]);
    }
    for(let offset=0;offset<bundle.passages.length;offset+=1000) await db.query('insert into passages(hash,body) select hash,body from jsonb_to_recordset($1::jsonb) as r(hash text,body text)',[JSON.stringify(bundle.passages.slice(offset,offset+1000))]);
    const citationRows=[];
    for (const c of bundle.citations) {
      const source = sources.get(c.source);
      const url = c.locator.postUrl || source.url + (c.locator.page ? '#page=' + c.locator.page : '');
      citationRows.push({document:c.source,url,hash:c.hash});
    }
    for(let offset=0;offset<citationRows.length;offset+=1000)await db.query('insert into citations(document,url,hash) select document,url,hash from jsonb_to_recordset($1::jsonb) as r(document integer,url text,hash text)',[JSON.stringify(citationRows.slice(offset,offset+1000))]);
    await db.exec('commit;create index passage_search on passages using gin(search);create index citation_hash on citations(hash);analyze');
      return {db, indexedAt, sourceCount: bundle.sources.length};
    })();
    try { return await dbPromise; } catch (error) { dbPromise = undefined; throw error; }
  };
  return {
    name: 'isolated-collection-review',
    configureServer(server) {
      void database().catch(error => console.error('Local source index preparation:', error.message));
      server.httpServer?.once('close', () => { if (dbPromise) void dbPromise.then(({db}) => db.close()).catch(() => {}); });
      server.middlewares.use('/__collection', async (req, res) => {
        let releaseSearch;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        try {
          if (req.method !== 'GET') { res.statusCode = 405; res.end(); return; }
          const u = new URL(req.url, 'http://localhost');
          let result;
          if (u.pathname === '/status') {
            const jobs = read('jobs.json', []), scope = read('scope.json', {seasons: [], teamSeasons: []});
            result = {
              seasons: scope.seasons.map(s => ({...s,
                candidates: new Set(jobs.flatMap(j => j.associations.filter(a => a.year === s.year).map(a => a.team))).size,
                collected: new Set(jobs.filter(j => j.status === 'collected').flatMap(j => j.associations.filter(a => a.year === s.year).map(a => a.team))).size})),
              selected: scope.teamSeasons.length, threads: jobs.length,
              pending: jobs.filter(j => ['pending','partial'].includes(j.status)).length,
              unavailable: jobs.filter(j => j.status === 'unavailable').length,
              pipeline: read('run-state.json', null),
              collectedThreads: jobs.filter(j => j.status === 'collected').length,
              blocked: jobs.filter(j => j.status === 'blocked').length,
              posts: jobs.reduce((n, j) => n + (j.posts || 0), 0), updatedAt: new Date().toISOString()
            };
          } else if (u.pathname === '/topics') {
            result = await getTopics();
          } else if (u.pathname === '/search') {
            const previous = searchPending;
            searchPending = new Promise(resolve => { releaseSearch = resolve; });
            await previous;
            const {db, indexedAt, sourceCount} = await database();
            const q = (u.searchParams.get('q') || '').slice(0, 200);
            const seasonText = u.searchParams.get('season') || '';
            const yearsText = u.searchParams.get('years') || seasonText;
            const years = [...new Set(yearsText ? yearsText.split(',').map(Number) : [])];
            if (years.length > 50 || years.some(year => !Number.isInteger(year) || year < 1992 || year > 2100)) {
              res.statusCode = 400; res.end(JSON.stringify({error: 'Invalid season'})); return;
            }
            const rawPage = Number(u.searchParams.get('page'));
            const page = Number.isFinite(rawPage) ? Math.max(0, Math.min(10000, Math.floor(rawPage))) : 0;
            const topicIds = [...new Set((u.searchParams.get('topics') || '').split(',').filter(Boolean))].slice(0, 50);
            const topics = await getTopics();
            if (topicIds.some(id => !topics.some(t => t.id === id))) {
              res.statusCode = 400; res.end(JSON.stringify({error: 'Selected topic is unavailable. Refresh topics.'})); return;
            }
            const sourceClass = u.searchParams.get('source') || '';
            if (!['','official','team','other'].includes(sourceClass)) { res.statusCode=400;res.end(JSON.stringify({error:'Invalid source category'}));return; }
            const params = [q, years, sourceClass];
            const clauses = topicIds.map(id => {
              const topic = topics.find(t => t.id === id);
              params.push([topic.name, topic.name_he, ...topic.synonyms].filter(Boolean));
              return `exists(select 1 from unnest($${params.length}::text[]) term where p.search @@ phraseto_tsquery('english',term))`;
            });
            const topicWhere = clauses.length ? ' and (' + clauses.join(u.searchParams.get('match') === 'all' ? ' and ' : ' or ') + ')' : '';
            const where = "($1='' or p.search @@ websearch_to_tsquery('english',$1)) and (cardinality($2::integer[])=0 or d.seasons && $2::integer[]) and ($3='' or d.source_class=$3)" + topicWhere;
            const joins = 'from passages p join citations c on c.hash=p.hash join documents d on c.document=d.id';
            const count = (await db.query(`select count(*)::int n ${joins} where ${where}`, params)).rows[0].n;
            const rows = (await db.query(`select c.id,c.url,case when $1='' then left(p.body,1400) else ts_headline('english',p.body,websearch_to_tsquery('english',$1),'StartSel=[, StopSel=], MaxWords=100, MinWords=40, MaxFragments=2') end body,d.title,d.seasons,d.source_class,d.scope ${joins} where ${where} order by case when $1='' then 0 else ts_rank_cd(p.search,websearch_to_tsquery('english',$1)) end desc,c.id limit 10 offset $${params.length+1}`, [...params, page * 10])).rows;
            result = {count, rows, page, indexedAt, sourceCount};
          } else { res.statusCode = 404; res.end(); return; }
          res.end(JSON.stringify(result));
        } catch (error) {
          console.error('Local source review:', error.message);
          res.statusCode = 500;
          res.end(JSON.stringify({error: 'Local collection index unavailable. Check the review server logs.'}));
        } finally {
          releaseSearch?.();
        }
      });
    }
  };
}
