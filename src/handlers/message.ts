import fs from "fs";
import path from "path";

const filePath = path.resolve(process.cwd(), "src/data/messages.json");

export type MessageItem =
  | {
      type: "text";
      content: string;
    }
  | {
      type: "image";
      caption?: string;
      image: string;
    };

// ler mensagens
export const readMessages = (): MessageItem[] => {
  if (!fs.existsSync(filePath)) return [];

  const data = fs.readFileSync(filePath, "utf-8").trim();

  if (!data) return [];

  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
};

// salvar mensagens
export const saveMessages = (data: MessageItem[]) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};