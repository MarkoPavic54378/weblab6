const CACHE = "snapnote-v1";
const APP_SHELL = [
  "/",
  "/index.html",
  "/styles.css",
  "/app.js",
  "/db.js",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/favicon.ico"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== "GET") return;

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          return cached || new Response(JSON.stringify({ error: "offline" }), {
            status: 503,
            headers: { "Content-Type": "application/json" }
          });
        })
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      return cached || fetch(req).catch(() => caches.match("/index.html"));
    })
  );
});

self.addEventListener("sync", (event) => {
  if (event.tag === "sync-notes") {
    event.waitUntil(syncPendingNotes());
  }
});

async function syncPendingNotes() {
  const pending = await idbGetPending();
  let syncedCount = 0;

  for (const note of pending) {
    try {
      const fd = new FormData();
      fd.append("id", note.id);
      fd.append("text", note.text || "");
      fd.append("createdAt", String(note.createdAt));
      fd.append("image", note.image, "note.jpg");

      const res = await fetch("/api/notes", { method: "POST", body: fd });
      if (!res.ok) break;

      await idbMarkSynced(note.id);
      syncedCount++;
    } catch {
      break;
    }
  }

  try {
    await fetch("/api/push/synced", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count: syncedCount })
    });
  } catch {}
}

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

async function idbGetPending() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const idx = tx.objectStore(STORE).index("status");
    const req = idx.getAll("pending");
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function idbMarkSynced(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const note = getReq.result;
      if (!note) return resolve();
      note.status = "synced";
      store.put(note);
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

self.addEventListener("push", (event) => {
  let data = { title: "SnapNote", body: "Notification" };
  try {
    data = event.data?.json() || data;
  } catch {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png"
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) return c.focus();
      }
      if (clients.openWindow) return clients.openWindow("/");
    })
  );
});
