const DB_NAME = "snapnote-db";
const DB_VERSION = 1;
const STORE = "notes";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const s = db.createObjectStore(STORE, { keyPath: "id" });
        s.createIndex("createdAt", "createdAt");
        s.createIndex("status", "status");
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
export async function getPendingNotes() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const idx = tx.objectStore(STORE).index("status");
    const req = idx.getAll("pending");
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function markSynced(id) {
  return setStatus(id, "synced");
}

export async function addNote(note) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).add(note);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function listNotes() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => {
      const items = req.result || [];
      items.sort((a, b) => b.createdAt - a.createdAt);
      resolve(items);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function setStatus(id, status) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const note = getReq.result;
      if (!note) return resolve();
      note.status = status;
      store.put(note);
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
