const DB_NAME = 'ryadom';
const DB_VERSION = 2;

const STORES = [
  'profile',
  'userMedications',
  'userConditions',
  'medicationLogs',
  'symptomLogs',
  'cycleLogs',
  'schedules',
  'messages',
  'memory',
  'meta'
];

let connection;

function requestAsPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB request failed'));
  });
}

export function openDatabase() {
  if (connection) return connection;
  connection = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      for (const name of STORES) {
        if (!database.objectStoreNames.contains(name)) {
          database.createObjectStore(name, { keyPath: 'id' });
        }
      }
    };
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => database.close();
      resolve(database);
    };
    request.onerror = () => reject(request.error || new Error('Database could not be opened'));
    request.onblocked = () => reject(new Error('Database upgrade is blocked by another tab'));
  });
  return connection;
}

async function objectStore(name, mode = 'readonly') {
  const database = await openDatabase();
  if (!database.objectStoreNames.contains(name)) throw new Error(`Missing data store: ${name}`);
  return database.transaction(name, mode).objectStore(name);
}

export const db = {
  async get(name, id) { return requestAsPromise((await objectStore(name)).get(id)); },
  async all(name) { return requestAsPromise((await objectStore(name)).getAll()); },
  async put(name, value) { return requestAsPromise((await objectStore(name, 'readwrite')).put(value)); },
  async remove(name, id) { return requestAsPromise((await objectStore(name, 'readwrite')).delete(id)); },
  async clear(name) { return requestAsPromise((await objectStore(name, 'readwrite')).clear()); }
};

export function makeId(prefix = 'item') {
  const random = globalThis.crypto?.getRandomValues
    ? crypto.getRandomValues(new Uint32Array(1))[0].toString(16)
    : Math.random().toString(16).slice(2);
  return `${prefix}-${Date.now()}-${random}`;
}

