import * as XLSX from "xlsx";
import { v4 as uuid } from "uuid";
import { readDB, saveDB } from "./database";

export const importCSV = (filePath: string) => {
  const workbook = XLSX.readFile(filePath, { type: "string" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  const data = XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });

  const db = readDB();

  const numerosJaExistentes = new Set(db.map((c: any) => c.numero));

  const formatted = [];
  const invalidos = [];

  for (const row of data) {
    let numero = String(row.numero).replace(/\D/g, "");

    // 🔥 CORREÇÃO AUTOMÁTICA
    if (!numero.startsWith("55") && numero.length >= 10) {
      numero = "55" + numero;
    }

    // 🚨 VALIDAÇÃO FORTE
    if (
      !numero.startsWith("55") ||
      numero.length < 12 ||
      numero.length > 13
    ) {
      invalidos.push(numero);
      console.log("❌ Número inválido:", numero);
      continue;
    }

    // 🚫 REMOVE DUPLICADOS (já existentes no banco)
    if (numerosJaExistentes.has(numero)) {
      console.log("⚠️ Número duplicado ignorado:", numero);
      continue;
    }

    numerosJaExistentes.add(numero);

    formatted.push({
      id: uuid(),
      numero,
      mensagem: String(row.mensagem || ""),
      status: "PENDING" as const,
      attempts: 0,
    });
  }

  // 💾 SALVA NO BANCO
  saveDB([...db, ...formatted]);

  // 📊 LOG FINAL
  console.log("✅ Importação finalizada");
  console.log("✔️ Válidos:", formatted.length);
  console.log("❌ Inválidos:", invalidos.length);
};