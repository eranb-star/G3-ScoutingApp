// apps/dashboard_web/src/lib/offlineDb.ts
// Offline cache + queue using IndexedDB (no deps)
// Fixes: VersionError (requested version < existing version)
// Adds: template/matches/matchTeams/scouts caches + entry queue

export type QueuedScoutEntry = {
  entry_uuid: string;
  event_id: string;
  match_id: string;
  team_number: number;
  scout_user_id: string | null;
  device_id: string;
  created_at: string; // ISO
  data: any;
  notes: string | null;
};

type TemplateCacheRow = {
  event_id: string;
  schema: any;
  cached_at: string; // ISO
};

type MatchesCacheRow = {
  event_id: string;
  matches: any[]; // MatchRow[] (kept as any to avoid importing types)
  cached_at: string; // ISO
};

type MatchTeamsCacheRow = {
  match_id: string;
  teams: number[];
  cached_at: string; // ISO
};

type ScoutsCacheRow = {
  event_id: string;
  scouts: any[]; // { display_name: string, ... }[]
  cached_at: string; // ISO
};

type StoreName = "entryQueue" | "templateCache" | "matchesCache" | "matchTeamsCache" | "scoutsCache";

const DB_NAME = "g3_scouting_offline_v1";

// IMPORTANT:
// If ANY device already created DB at version 2,
// opening with version 1 will throw VersionError.
// We bump to 4 to be safe for future store additions.
const DB_VERSION = 4;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;

      // Create stores if missing (safe across upgrades)
      if (!db.objectStoreNames.contains("entryQueue")) {
        db.createObjectStore("entryQueue", { keyPath: "entry_uuid" });
      }
      if (!db.objectStoreNames.contains("templateCache")) {
        db.createObjectStore("templateCache", { keyPath: "event_id" });
      }
      if (!db.objectStoreNames.contains("matchesCache")) {
        db.createObjectStore("matchesCache", { keyPath: "event_id" });
      }
      if (!db.objectStoreNames.contains("matchTeamsCache")) {
        db.createObjectStore("matchTeamsCache", { keyPath: "match_id" });
      }
      if (!db.objectStoreNames.contains("scoutsCache")) {
        db.createObjectStore("scoutsCache", { keyPath: "event_id" });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(
  storeName: StoreName,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<any>
): Promise<T> {
  const db = await openDb();

  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);

    let req: IDBRequest<any>;
    try {
      req = fn(store);
    } catch (e) {
      try {
        db.close();
      } catch {}
      reject(e);
      return;
    }

    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);

    const close = () => {
      try {
        db.close();
      } catch {}
    };
    tx.oncomplete = close;
    tx.onerror = close;
    tx.onabort = close;
  });
}

// =======================
// Queue: scout_entries
// =======================
export async function enqueueScoutEntry(entry: QueuedScoutEntry): Promise<void> {
  await withStore<void>("entryQueue", "readwrite", (store) => store.put(entry));
}

export async function listQueuedScoutEntries(): Promise<QueuedScoutEntry[]> {
  const all = await withStore<QueuedScoutEntry[]>("entryQueue", "readonly", (store) => store.getAll());
  return Array.isArray(all) ? all : [];
}

export async function removeQueuedScoutEntry(entry_uuid: string): Promise<void> {
  await withStore<void>("entryQueue", "readwrite", (store) => store.delete(entry_uuid));
}

export async function clearQueuedScoutEntries(): Promise<void> {
  await withStore<void>("entryQueue", "readwrite", (store) => store.clear());
}

export async function getQueuedScoutEntryCount(): Promise<number> {
  try {
    const c = await withStore<number>("entryQueue", "readonly", (store) => store.count());
    return Number(c ?? 0);
  } catch {
    const all = await listQueuedScoutEntries();
    return all.length;
  }
}

// =======================
// Cache: template by event
// =======================
export async function cacheTemplate(event_id: string, schema: any): Promise<void> {
  const row: TemplateCacheRow = {
    event_id,
    schema,
    cached_at: new Date().toISOString(),
  };
  await withStore<void>("templateCache", "readwrite", (store) => store.put(row));
}

export async function getCachedTemplate(event_id: string): Promise<TemplateCacheRow | null> {
  const row = await withStore<TemplateCacheRow | undefined>("templateCache", "readonly", (store) => store.get(event_id));
  return row ?? null;
}

// =======================
// Cache: matches by event
// =======================
export async function cacheMatches(event_id: string, matches: any[]): Promise<void> {
  const row: MatchesCacheRow = {
    event_id,
    matches,
    cached_at: new Date().toISOString(),
  };
  await withStore<void>("matchesCache", "readwrite", (store) => store.put(row));
}

export async function getCachedMatches(event_id: string): Promise<MatchesCacheRow | null> {
  const row = await withStore<MatchesCacheRow | undefined>("matchesCache", "readonly", (store) => store.get(event_id));
  return row ?? null;
}

// =======================
// Cache: match teams by match_id
// =======================
export async function cacheMatchTeams(match_id: string, teams: number[]): Promise<void> {
  const row: MatchTeamsCacheRow = {
    match_id,
    teams,
    cached_at: new Date().toISOString(),
  };
  await withStore<void>("matchTeamsCache", "readwrite", (store) => store.put(row));
}

export async function getCachedMatchTeams(match_id: string): Promise<MatchTeamsCacheRow | null> {
  const row = await withStore<MatchTeamsCacheRow | undefined>(
    "matchTeamsCache",
    "readonly",
    (store) => store.get(match_id)
  );
  return row ?? null;
}

// =======================
// Cache: scouts by event (scouter names directory)
// =======================
export async function cacheScouts(event_id: string, scouts: any[]): Promise<void> {
  const row: ScoutsCacheRow = {
    event_id,
    scouts,
    cached_at: new Date().toISOString(),
  };
  await withStore<void>("scoutsCache", "readwrite", (store) => store.put(row));
}

export async function getCachedScouts(event_id: string): Promise<ScoutsCacheRow | null> {
  const row = await withStore<ScoutsCacheRow | undefined>("scoutsCache", "readonly", (store) => store.get(event_id));
  return row ?? null;
}
