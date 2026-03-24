import fs from "fs";
import path from "path";

export type ContactDB = {
  id: string;
  numero: string;
  mensagem: string;
  status: "PENDING" | "SENT" | "FAILED";
  attempts: number;
  lastError?: string;
  imagem?: string; // ✅ aqui
};

// caminho do arquivo JSON
const filePath = path.resolve(__dirname, "data/contatos.json");

// lê o banco
export const readDB = (): ContactDB[] => {
  if (!fs.existsSync(filePath)) return [];

  const data = fs.readFileSync(filePath, "utf-8").trim();

  if (!data) return []; // protege arquivo vazio

  try {
    return JSON.parse(data) as ContactDB[];
  } catch (err) {
    console.error("⚠️ Erro ao ler contacts.json, iniciando vazio");
    return [];
  }
};

// salva o banco
export const saveDB = (data: ContactDB[]) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};