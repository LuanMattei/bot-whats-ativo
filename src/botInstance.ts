import { WASocket } from "baileys";

let sock: WASocket | null = null;

export const setSocket = (instance: WASocket) => {
  sock = instance;
};

export const getSocket = () => {
  if (!sock) throw new Error("Socket não inicializado");
  return sock;
};