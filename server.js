import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import webpush from "web-push";
import fs from "fs";
import "dotenv/config";
import multer from "multer";
const upload = multer();
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const PORT = process.env.PORT || 3000;
const SUBS_FILE = "./subscriptions.json";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.log("⚠️ Missing VAPID keys in env.");
} else {
  webpush.setVapidDetails("mailto:test@example.com", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}


function loadSubs() {
  try { return JSON.parse(fs.readFileSync(SUBS_FILE, "utf-8")); }
  catch { return []; }
}
function saveSubs(subs) {
  fs.writeFileSync(SUBS_FILE, JSON.stringify(subs, null, 2));
}

let subscriptions = loadSubs();

app.use(express.json({ limit: "1mb" }));

app.use(express.static(path.join(__dirname, "public")));

app.get("/api/ping", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});
app.get("/api/push/public-key", (req, res) => {
  res.json({ key: process.env.VAPID_PUBLIC_KEY || "" });
});

app.listen(PORT, () => {
  console.log("Server running on http://localhost:" + PORT);
});



app.get("/api/push/public-key", (req, res) => {
  res.json({ key: process.env.VAPID_PUBLIC_KEY || "" });
});
app.post("/api/push/subscribe", (req, res) => {
  const sub = req.body;

  if (!sub || !sub.endpoint) {
    return res.status(400).json({ ok: false, error: "Missing subscription.endpoint" });
  }

  subscriptions = subscriptions.filter(s => s.endpoint !== sub.endpoint);
  subscriptions.push(sub);

  res.json({ ok: true });
});
app.post("/api/notes", upload.single("image"), (req, res) => {
  res.json({ ok: true });
});

app.post("/api/push/synced", async (req, res) => {
  const count = Number(req.body?.count ?? 0);

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return res.status(500).json({ ok: false, error: "Missing VAPID keys" });
  }

  const payload = JSON.stringify({
    title: "SnapNote",
    body: count > 0 ? `Synced ${count} notes ✅` : "Sync complete ✅"
  });

  const stillValid = [];
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(sub, payload);
      stillValid.push(sub);
    } catch (e) {

    }
  }
  subscriptions = stillValid;
  saveSubs(subscriptions);

  res.json({ ok: true });
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
