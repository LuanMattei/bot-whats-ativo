process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import QRCode from "qrcode";

let currentQR = "";
export const getQR = () => currentQR;

let isConnected = false;

export const getConnectionStatus = () => isConnected;

import makeWASocket, {
  Browsers,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestWaWebVersion,
} from "baileys";

import { Boom } from "@hapi/boom";
import { webcrypto } from "node:crypto";
import qrcode from "qrcode-terminal";

import { setSocket } from "./botInstance";

if (typeof global.crypto === "undefined") {
  global.crypto = webcrypto as any;
}

export const initWASocket = async (): Promise<void> => {
  const { state, saveCreds } = await useMultiFileAuthState("auth");

  const { version } = await fetchLatestWaWebVersion({});

  const sock = makeWASocket({
    auth: state,
    browser: Browsers.ubuntu("Chrome"),
    printQRInTerminal: false,
    version,
  });

  sock.ev.on("connection.update", async ({ connection, qr }: any) => {
    if (qr) {
    console.log("📲 Novo QR gerado");

    qrcode.generate(qr, { small: true }); // terminal

    currentQR = await QRCode.toDataURL(qr); // 🔥 frontend
    }

    if (connection === "open") {
      console.log("✅ Bot conectado");

      isConnected = true; // 🔥 conectado
      setSocket(sock); // 🔥 salva socket
    }

    if (connection === "close") {
      console.log("❌ Conexão fechada");
      isConnected = false; // 🔥 desconectado
      
      setTimeout(() => initWASocket(), 5000);
    }
  });

  sock.ev.on("creds.update", saveCreds);
};

initWASocket();