import { WASocket } from "baileys";
import { readDB, saveDB } from "./database";
import { smartControlDelay } from "./utils/delay";
import { readMessages } from "./handlers/message";



let isRunning = false;

const getRandomMessage = () => {
  const msgs = readMessages();

  if (msgs.length === 0) {
    return "Olá! 😊";
  }

  return msgs[Math.floor(Math.random() * msgs.length)];
};

// 🔥 parar manual
export const stopSending = () => {
  isRunning = false;
};

// 🔥 stats
export const getStats = () => {
  const db = readDB();

  return {
    sent: db.filter((c) => c.status === "SENT").length,
    total: db.length,
  };
};

// 🔥 DISPARO CONTROLADO (SEM LOOP INFINITO)
export const startSending = async (sock: WASocket) => {
  if (isRunning) return;

  isRunning = true;

  console.log("🚀 Disparador iniciado");

  const db = readDB();

  let processed = false;

  for (const contact of db) {
    if (!isRunning) break;

    if (contact.status !== "PENDING") continue;

    processed = true;

    try {
      const jid = `${contact.numero}@s.whatsapp.net`;

      console.log(`📤 Enviando para ${contact.numero}`);

      await sock.sendMessage(jid, {
        text: getRandomMessage(),
      });

      contact.status = "SENT";
      contact.attempts++;

      saveDB(db);

      await smartControlDelay();
    } catch (err: any) {
      contact.status = "FAILED";
      contact.attempts++;

      saveDB(db);
    }
  }

  if (!processed) {
    console.log("🛑 Nenhum contato PENDING encontrado");
  } else {
    console.log("🎯 Lista finalizada");
  }

  isRunning = false;
};