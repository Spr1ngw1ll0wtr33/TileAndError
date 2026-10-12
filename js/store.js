// Saved data, kept in this app's own IndexedDB database (named so it cannot clash with the
// other apps at the same web address).

const DB_NAME = 'tile-and-error';
const DB_VERSION = 1;

let dbPromise = null;

function open() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
        if (!db.objectStoreNames.contains('history')) db.createObjectStore('history', { keyPath: 'n', autoIncrement: true });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

function run(storeName, mode, fn) {
  return open().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    let result;
    const req = fn(store);
    if (req) req.onsuccess = () => { result = req.result; };
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  }));
}

export const get = key => run('kv', 'readonly', s => s.get(key));
export const set = (key, value) => run('kv', 'readwrite', s => s.put(value, key));
export const del = key => run('kv', 'readwrite', s => s.delete(key));

export const addHistory = entry => run('history', 'readwrite', s => s.add(entry));

/** History entries, newest first. */
export function getHistory() {
  return run('history', 'readonly', s => s.getAll()).then(all => (all || []).reverse());
}

/** Ask the browser not to clear this data when space runs low. */
export async function persist() {
  if (!navigator.storage || !navigator.storage.persist) return false;
  if (await navigator.storage.persisted()) return true;
  return navigator.storage.persist();
}

export async function isPersisted() {
  return !!(navigator.storage && navigator.storage.persisted && await navigator.storage.persisted());
}

/** Everything, as one object for a backup file. */
export async function exportAll() {
  return {
    app: 'Tile & Error',
    exported: new Date().toISOString(),
    profile: await get('profile'),
    current: (await get('current')) || null,
    history: (await getHistory()).reverse(),
  };
}

/** Replace everything with the contents of a backup file. */
export async function importAll(data) {
  if (!data || data.app !== 'Tile & Error' || !data.profile) throw new Error('This does not look like a Tile & Error backup file.');
  await set('profile', data.profile);
  if (data.current) await set('current', data.current); else await del('current');
  await run('history', 'readwrite', s => s.clear());
  for (const h of data.history || []) {
    const { n, ...entry } = h;
    await addHistory(entry);
  }
}
