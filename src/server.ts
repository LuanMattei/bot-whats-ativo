import express, { Request, Response } from "express";
import cors from "cors";

import "./index";
import { getQR, getConnectionStatus } from "./index";

import { getSocket } from "./botInstance";
import { startSending, stopSending, getStats } from "./sender";

import { ContactDB, readDB, saveDB } from "./database";
import { readMessages, saveMessages } from "./handlers/message";

const app = express();

app.use(cors());
app.use(express.json());

let isRunning = false;
let isScheduled = false;
let scheduledTimeText = "";
let cancelSchedule = false;
let schedulePromise: Promise<void> | null = null;
/* =========================
   ⏰ HELPERS
========================= */

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitUntilStartTime(hour: number, minute: number) {
  const now = new Date();
  const start = new Date();

  start.setHours(hour);
  start.setMinutes(minute);
  start.setSeconds(0);
  start.setMilliseconds(0);

  if (now.getTime() > start.getTime()) {
    start.setDate(start.getDate() + 1);
  }

  const diff = start.getTime() - now.getTime();

  scheduledTimeText = start.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  console.log(`⏰ Agendado para ${scheduledTimeText}`);

  await sleep(diff);
}

/* =========================
   🚀 START
========================= */

app.post("/start", async (req: Request, res: Response) => {
  if (isRunning) {
    return res.json({ message: "Já está rodando" });
  }

  if (isScheduled) {
    return res.json({ message: "Já existe um agendamento ativo ⏰" });
  }

  try {
    const sock = getSocket();

    const { hour = 20, minute = 0 } = req.body || {};

    isScheduled = true;
    cancelSchedule = false;

    schedulePromise = (async () => {
      const now = new Date();
      const start = new Date();

      start.setHours(hour);
      start.setMinutes(minute);
      start.setSeconds(0);
      start.setMilliseconds(0);

      if (now.getTime() > start.getTime()) {
        start.setDate(start.getDate() + 1);
      }

      const diff = start.getTime() - now.getTime();

      scheduledTimeText = start.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      console.log(`⏰ Agendado para ${scheduledTimeText}`);

      await new Promise((resolve) => setTimeout(resolve, diff));

      // 🔥 VERIFICA CANCELAMENTO
      if (cancelSchedule) {
        console.log("❌ Agendamento cancelado antes de iniciar");
        return;
      }

      console.log("🚀 Iniciando disparo agora...");

      isScheduled = false;
      isRunning = true;

      await startSending(sock);

      isRunning = false;
    })();

    return res.json({
      message: `Disparo agendado para ${hour}:${minute
        .toString()
        .padStart(2, "0")}`,
      scheduledTime: `${hour}:${minute.toString().padStart(2, "0")}`,
    });

  } catch (err) {
    isRunning = false;
    isScheduled = false;
    cancelSchedule = false;
    return res.status(500).json({ error: "Erro ao iniciar" });
  }
});

/* =========================
   ⏸️ PAUSE
========================= */

app.post("/pause", (req: Request, res: Response) => {
  stopSending();

  isRunning = false;
  isScheduled = false;

  // 🔥 cancela agendamento pendente
  cancelSchedule = true;

  console.log("🛑 Execução pausada + agendamento cancelado");

  res.json({ message: "Pausado ⏸️" });
});
/* =========================
   📊 STATUS
========================= */

app.get("/status", (req: Request, res: Response) => {
  res.json({
    running: isRunning,
    scheduled: isScheduled,
    scheduledTime: scheduledTimeText,
    connected: getConnectionStatus(),
    ...getStats(),
  });
});

/* =========================
   QR
========================= */

app.get("/qr", (req: Request, res: Response) => {
  res.json({ qr: getQR() });
});

/* =========================
   CONTATOS
========================= */

app.get("/contacts", (req, res) => {
  res.json(readDB());
});

app.post("/contacts", (req, res) => {
  const db = readDB();

  const exists = db.find(c => c.numero === req.body.numero);
  if (exists) {
    return res.status(400).json({ error: "Número já existe" });
  }

  const newContact: ContactDB = {
    id: Date.now().toString(),
    numero: req.body.numero,
    mensagem: req.body.mensagem || "",
    status: "PENDING",
    attempts: 0,
  };

  db.push(newContact);
  saveDB(db);

  res.json(newContact);
});

app.put("/contacts/:id", (req, res) => {
  const db = readDB();

  const contact = db.find(c => c.id === req.params.id);
  if (!contact) return res.status(404).send("Não encontrado");

  Object.assign(contact, req.body);

  saveDB(db);
  res.json(contact);
});

app.delete("/contacts/:id", (req, res) => {
  let db = readDB();
  db = db.filter(c => c.id !== req.params.id);
  saveDB(db);

  res.json({ ok: true });
});

app.post("/contacts/reset", (req, res) => {
  const db = readDB();

  db.forEach(c => {
    c.status = "PENDING";
    c.attempts = 0;
  });

  saveDB(db);

  res.json({ ok: true });
});

/* =========================
   MESSAGES
========================= */

app.get("/messages", (req, res) => {
  res.json(readMessages());
});

app.post("/messages", (req, res) => {
  const msgs = readMessages();
  msgs.push(req.body.message);
  saveMessages(msgs);
  res.json(msgs);
});

app.put("/messages/:index", (req, res) => {
  const msgs = readMessages();
  msgs[Number(req.params.index)] = req.body.message;
  saveMessages(msgs);
  res.json(msgs);
});

app.delete("/messages/:index", (req, res) => {
  const msgs = readMessages();
  msgs.splice(Number(req.params.index), 1);
  saveMessages(msgs);
  res.json(msgs);
});

/* =========================
   SERVER
========================= */

app.listen(3000, () => {
  console.log("🚀 API rodando na porta 3000");
});