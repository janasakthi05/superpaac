// functions/index.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

/* --------------------------
   SEND PUSH TO ONE ROLL
--------------------------- */
exports.sendPushToRoll = functions.https.onRequest(async (req, res) => {
  try {
    const { roll, title, body, data } = req.body || {};
    if (!roll || !title || !body)
      return res.status(400).send({ error: "Missing roll/title/body" });

    const rollId = String(roll).trim().toUpperCase();
    const ref = db.collection("deviceTokens").doc(rollId);
    const snap = await ref.get();

    if (!snap.exists)
      return res.status(404).send({ error: "No token for this roll" });

    const token = snap.data().token;
    const isExpo = token.startsWith("ExponentPushToken");

    const payload = { title, body, data: data || {} };

    // Send via Expo Push API
    if (isExpo) {
      const resp = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([{ to: token, ...payload }]),
      });

      const json = await resp.json();
      return res.send({ ok: true, provider: "expo", response: json });
    }
  } catch (err) {
    return res.status(500).send({ error: String(err) });
  }
});

/* --------------------------
   BROADCAST PUSH TO ALL USERS
--------------------------- */
exports.sendBroadcast = functions.https.onRequest(async (req, res) => {
  try {
    const { title, body, data } = req.body || {};
    if (!title || !body)
      return res.status(400).send({ error: "Missing title/body" });

    const snap = await db.collection("deviceTokens").get();
    const msgs = [];

    snap.forEach((doc) => {
      const token = doc.data().token;
      if (!token) return;
      msgs.push({ to: token, title, body, data: data || {} });
    });

    if (msgs.length === 0)
      return res.status(404).send({ error: "No tokens found" });

    const resp = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(msgs),
    });

    const json = await resp.json();
    return res.send({ ok: true, result: json });
  } catch (err) {
    return res.status(500).send({ error: String(err) });
  }
});
