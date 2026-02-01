import { addNote, listNotes } from "./db.js";

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}
const btnSave = document.getElementById("btnSave");
const notesList = document.getElementById("notesList");
const textInput = document.getElementById("text");

const cameraBlock = document.getElementById("cameraBlock");
const fallbackBlock = document.getElementById("fallbackBlock");

const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const preview = document.getElementById("preview");

const btnStartCamera = document.getElementById("btnStartCamera");
const btnCapture = document.getElementById("btnCapture");
const btnStopCamera = document.getElementById("btnStopCamera");

const fileInput = document.getElementById("file");

let stream = null;
let lastPhotoBlob = null;

function showFallback() {
  cameraBlock.hidden = true;
  fallbackBlock.hidden = false;
}

function showCameraUI() {
  fallbackBlock.hidden = true;
  cameraBlock.hidden = false;
}

function stopStream() {
  if (stream) {
    for (const track of stream.getTracks()) track.stop();
    stream = null;
  }
  if (video) video.srcObject = null;

  btnCapture.disabled = true;
  btnStopCamera.disabled = true;
}

async function startStream() {
  const canCamera = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  if (!canCamera) {
    showFallback();
    return;
  }

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false
    });

    video.srcObject = stream;
    showCameraUI();

    btnCapture.disabled = false;
    btnStopCamera.disabled = false;
  } catch (e) {
    showFallback();
  }
}

function captureToBlob() {
  const w = video.videoWidth || 640;
  const h = video.videoHeight || 480;

  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d", { alpha: false });
  ctx.drawImage(video, 0, 0, w, h);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.85);
  });
}

btnStartCamera?.addEventListener("click", async () => {
  await startStream();
});

btnStopCamera?.addEventListener("click", () => {
  stopStream();
});

btnCapture?.addEventListener("click", async () => {
  const blob = await captureToBlob();
  if (!blob) return;

  lastPhotoBlob = blob;
  preview.src = URL.createObjectURL(blob);
});

fileInput?.addEventListener("change", () => {
  const f = fileInput.files?.[0];
  if (!f) return;

  lastPhotoBlob = f;
  preview.src = URL.createObjectURL(f);
});

window.addEventListener("beforeunload", stopStream);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopStream();
});

if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
  showCameraUI();
} else {
  showFallback();
}
async function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) output[i] = rawData.charCodeAt(i);
  return output;
}
async function sendSubscriptionToServer(sub) {
  if (!navigator.onLine) return; 

  try {
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sub)
    });
  } catch {
  }
}

async function setupPush() {
  if (!("serviceWorker" in navigator)) return;
  if (!("PushManager" in window)) return;
  if (!("Notification" in window)) return;
  if (!navigator.onLine) return;
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return;

  const { key } = await fetch("/api/push/public-key").then(r => r.json());
  if (!key) return;

  const reg = await navigator.serviceWorker.ready;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: await urlBase64ToUint8Array(key)
    });
  }

  await sendSubscriptionToServer(sub);


}
window.addEventListener("online", async () => {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await sendSubscriptionToServer(sub);
  } catch {}
});

setupPush().catch(() => {});

window.__getLastPhotoBlob = () => lastPhotoBlob;

document.getElementById("ping").onclick = async () => {
  const r = await fetch("/api/ping");
  const j = await r.json();
  document.getElementById("out").textContent =
    JSON.stringify(j, null, 2);
};
async function renderNotes() {
  const notes = await listNotes();
  notesList.innerHTML = "";

  for (const n of notes) {
    const li = document.createElement("li");
    li.style.marginBottom = "12px";

    const meta = document.createElement("div");
    meta.textContent = `${n.status.toUpperCase()} • ${new Date(n.createdAt).toLocaleString()} • ${n.text || ""}`;

    const img = document.createElement("img");
    img.style.maxWidth = "240px";
    img.style.display = "block";
    img.style.borderRadius = "10px";
    img.style.marginTop = "6px";

    img.src = URL.createObjectURL(n.image);

    li.appendChild(meta);
    li.appendChild(img);
    notesList.appendChild(li);
  }
}
btnSave?.addEventListener("click", async () => {
  const blob = window.__getLastPhotoBlob?.();
  if (!blob) {
    alert("Prvo slikaj ili odaberi sliku.");
    return;
  }

  const note = {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    text: (textInput?.value || "").trim(),
    status: "pending",
    image: blob
  };

  await addNote(note);

  if (textInput) textInput.value = "";
  if (preview) {
    preview.hidden = true;
    preview.removeAttribute("src");
  }

  await renderNotes();
    if ("serviceWorker" in navigator && "SyncManager" in window) {
    try {
        const reg = await navigator.serviceWorker.ready;
        await reg.sync.register("sync-notes");
    } catch {
    }
    }

});
renderNotes();
