import express, { Request, Response } from "express";
import cors from "cors";

import "./index"; // 🔥 inicia o bot
import { getQR, getConnectionStatus } from "./index";

import { getSocket } from "./botInstance";
import { startSending, stopSending, getStats } from "./sender";

import { ContactDB, readDB, saveDB } from "./database";
import { readMessages, saveMessages } from "./handlers/message";

const app = express();

app.use(cors());
app.use(express.json());

let isRunning = false;

/* =========================
   ⏰ HELPERS (NOVO)
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

  // se já passou hoje → agenda pra amanhã
  if (now.getTime() > start.getTime()) {
    start.setDate(start.getDate() + 1);
  }

  const diff = start.getTime() - now.getTime();

  console.log(`⏰ Aguardando até ${start.toLocaleTimeString()} para iniciar...`);

  await sleep(diff);
}

/* =========================
   🚀 CONTROLE DISPARO
========================= */

app.post("/start", async (req: Request, res: Response) => {
  if (isRunning) {
    return res.json({ message: "Já está rodando" });
  }

  try {
    const sock = getSocket();
    isRunning = true;

    // 🔥 pode vir do front ou usa padrão 08:07
    const { hour = 8, minute = 12 } = req.body || {};

    waitUntilStartTime(hour, minute).then(() => {
      console.log("🚀 Iniciando disparo agora...");

      startSending(sock).finally(() => {
        isRunning = false;
      });
    });

    res.json({
      message: `Disparo agendado para ${hour}:${minute.toString().padStart(2, "0")} ⏰`
    });

  } catch (err) {
    isRunning = false;
    res.status(500).json({ error: "Erro ao iniciar" });
  }
});

app.post("/pause", (req: Request, res: Response) => {
  stopSending();
  isRunning = false;

  res.json({ message: "Pausado ⏸️" });
});

app.get("/status", (req: Request, res: Response) => {
  res.json({
    running: isRunning,
    connected: getConnectionStatus(),
    ...getStats()
  });
});

app.get("/qr", (req: Request, res: Response) => {
  res.json({ qr: getQR() });
});

/* =========================
   📇 CONTATOS CRUD
========================= */

// 🔎 LISTAR
app.get("/contacts", (req, res) => {
  const db = readDB();
  res.json(db);
});

// ➕ CRIAR
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

// ✏️ ATUALIZAR
app.put("/contacts/:id", (req, res) => {
  const db = readDB();

  const contact = db.find(c => c.id === req.params.id);

  if (!contact) return res.status(404).send("Não encontrado");

  if (req.body.numero !== undefined) contact.numero = req.body.numero;
  if (req.body.mensagem !== undefined) contact.mensagem = req.body.mensagem;
  if (req.body.status !== undefined) contact.status = req.body.status;
  if (req.body.attempts !== undefined) contact.attempts = req.body.attempts;
  if (req.body.lastError !== undefined) contact.lastError = req.body.lastError;

  saveDB(db);

  res.json(contact);
});

// ❌ DELETAR
app.delete("/contacts/:id", (req, res) => {
  let db = readDB();

  db = db.filter(c => c.id !== req.params.id);

  saveDB(db);

  res.json({ ok: true });
});

// 🔁 RESETAR STATUS
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
   💬 MENSAGENS
========================= */

// GET
app.get("/messages", (req, res) => {
  res.json(readMessages());
});

// ADD
app.post("/messages", (req, res) => {
  const msgs = readMessages();

  msgs.push(req.body.message);

  saveMessages(msgs);

  res.json(msgs);
});

// UPDATE
app.put("/messages/:index", (req, res) => {
  const msgs = readMessages();

  msgs[Number(req.params.index)] = req.body.message;

  saveMessages(msgs);

  res.json(msgs);
});

// DELETE
app.delete("/messages/:index", (req, res) => {
  const msgs = readMessages();

  msgs.splice(Number(req.params.index), 1);

  saveMessages(msgs);

  res.json(msgs);
});

/* =========================
   🚀 SERVER
========================= */

app.listen(3000, () => {
  console.log("🚀 API rodando na porta 3000");
});