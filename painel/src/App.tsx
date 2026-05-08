import { useEffect, useState } from "react";

export default function App() {
  const API = "http://localhost:3000";

  const [scheduled, setScheduled] = useState(false);
  const [scheduledTime, setScheduledTime] = useState("");

  const [qr, setQr] = useState("");
  const [connected, setConnected] = useState(false);
  const [running, setRunning] = useState(false);
  const [sent, setSent] = useState(0);
  const [total, setTotal] = useState(0);

  const [contacts, setContacts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [newNumber, setNewNumber] = useState("");

  type Message =
  | {
      type: "text";
      content: string;
    }
  | {
      type: "image";
      caption: string;
      image: string;
    };

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState("");

  const [showMessages, setShowMessages] = useState(true);
  const [showContacts, setShowContacts] = useState(true);

  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  const [msgPage, setMsgPage] = useState(1);
  const msgPerPage = 2;

  const [hour, setHour] = useState("");
  const [minute, setMinute] = useState("");

  const fetchAll = async () => {
    const [s, q, c, m] = await Promise.all([
      fetch(`${API}/status`).then(r => r.json()),
      fetch(`${API}/qr`).then(r => r.json()),
      fetch(`${API}/contacts`).then(r => r.json()),
      fetch(`${API}/messages`).then(r => r.json()),
    ]);

    setScheduled(s.scheduled);
    setRunning(s.running);
    setConnected(s.connected);
    setSent(s.sent || 0);
    setTotal(s.total || 0);
    setScheduledTime(s.scheduledTime || "");

    setQr(q.qr);
    setContacts(c);
    setMessages(m);
  };

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 3000);
    return () => clearInterval(interval);
  }, []);

  const filtered = contacts.filter(c => c.numero.includes(search));
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const totalMsgPages = Math.ceil(messages.length / msgPerPage);

  const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const paginatedMessages = messages.slice(
    (msgPage - 1) * msgPerPage,
    msgPage * msgPerPage
  );

  const progress = total > 0 ? (sent / total) * 100 : 0;

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>📲 Painel WhatsApp</h1>

      {/* STATUS */}
      <div style={styles.card}>
        <p>
          Status:{" "}
          <strong style={{ color: running ? "green" : scheduled ? "orange" : "red" }}>
            {running ? "Rodando" : scheduled ? `Aguardando até ${scheduledTime}` : "Parado"}
          </strong>
        </p>

        <p>📤 {sent} / {total}</p>

        <div style={styles.progressBar}>
          <div style={{ ...styles.progressFill, width: `${progress}%` }} />
        </div>
      </div>

      {/* CONTROLE */}
      <div style={styles.card}>
        <div style={styles.row}>
          <input
            type="number"
            placeholder="Hora"
            value={hour}
            onChange={(e) => setHour(e.target.value)}
            style={styles.input}
          />
          <input
            type="number"
            placeholder="Min"
            value={minute}
            onChange={(e) => setMinute(e.target.value)}
            style={styles.input}
          />
        </div>

        <button
          onClick={() =>
            fetch(`${API}/start`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                hour: Number(hour),
                minute: Number(minute),
              }),
            })
          }
          style={styles.startBtn}
        >
          🚀 Iniciar
        </button>

        <button
          onClick={() => fetch(`${API}/pause`, { method: "POST" })}
          style={styles.pauseBtn}
        >
          ⏸️ Pausar
        </button>
      </div>

      {/* QR */}
      <div style={styles.card}>
        {connected ? (
          <p style={styles.connected}>🟢 Conectado</p>
        ) : qr ? (
          <img src={qr} style={styles.qr} />
        ) : (
          <p>Aguardando QR...</p>
        )}
      </div>

      {/* 💬 MENSAGENS (COM PAGINAÇÃO RESTAURADA) */}
      <div style={styles.sidebarLeft}>
        <div style={styles.sidebarHeader} onClick={() => setShowMessages(!showMessages)}>
          💬 Mensagens ({messages.length})
        </div>

        <div style={{ ...styles.sidebarContent, maxHeight: showMessages ? 500 : 0, opacity: showMessages ? 1 : 0 }}>

          <div style={styles.row}>
            <input value={newMsg} onChange={(e) => setNewMsg(e.target.value)} style={styles.input} />
            <button onClick={async () => {
              if (!newMsg) return;
              await fetch(`${API}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: newMsg }),
              });
              setNewMsg("");
              fetchAll();
            }}>➕</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {paginatedMessages.map((msg, i) => {
              const realIndex = (msgPage - 1) * msgPerPage + i;

              return (
                <div key={realIndex} style={styles.contactCard}>
                  {msg.type === "text" ? (
  <p>{msg.content}</p>
) : (
  <>
    <img
      src={msg.image}
      alt=""
      style={{ width: "100%", borderRadius: 8 }}
    />
    <p>{msg.caption}</p>
  </>
)}
                  <div>
                    <button onClick={() => {

  const m = prompt(
    "Editar:",
    msg.type === "text"
      ? msg.content
      : msg.caption
  );

  if (!m) return;

  fetch(`${API}/messages/${realIndex}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },

    body: JSON.stringify(    
      msg.type === "text"
        ? {
            ...msg,
            content: m
          }
        : {
            ...msg,
            caption: m
          }
    ),

  }).then(fetchAll);

}}>
  ✏️
</button>
                    <button onClick={() =>
                      fetch(`${API}/messages/${realIndex}`, { method: "DELETE" }).then(fetchAll)
                    }>❌</button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 🔥 PAGINAÇÃO MENSAGENS (RESTAURADA) */}
          <div style={styles.pagination}>
            <button onClick={() => setMsgPage(1)}>⏮️</button>
            <button disabled={msgPage === 1} onClick={() => setMsgPage(msgPage - 1)}>⬅️</button>
            <span>{msgPage} / {totalMsgPages || 1}</span>
            <button disabled={msgPage === totalMsgPages} onClick={() => setMsgPage(msgPage + 1)}>➡️</button>
            <button onClick={() => setMsgPage(totalMsgPages)}>⏭️</button>
          </div>

        </div>
      </div>

      {/* 📇 CONTATOS (COM PAGINAÇÃO RESTAURADA) */}
      <div style={styles.sidebarRight}>
        <div style={styles.sidebarHeader} onClick={() => setShowContacts(!showContacts)}>
          📇 Contatos ({contacts.length})
        </div>

        <div style={{ ...styles.sidebarContent, maxHeight: showContacts ? "none" : 0, opacity: showContacts ? 1 : 0 }}>

          <input value={search} onChange={(e) => setSearch(e.target.value)} style={styles.input} />

          <div style={styles.row}>
            <input value={newNumber} onChange={(e) => setNewNumber(e.target.value)} style={styles.input} />
            <button onClick={async () => {
              if (!newNumber) return;
              await fetch(`${API}/contacts`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ numero: newNumber }),
              });
              setNewNumber("");
              fetchAll();
            }}>➕</button>
          </div>

          <button onClick={() => fetch(`${API}/contacts/reset`, { method: "POST" }).then(fetchAll)}>
            🔄 Resetar TODOS
          </button>

          {paginated.map((c) => (
            <div key={c.id} style={{ ...styles.contactCard, background: c.status === "SENT" ? "#d4edda" : c.status === "FAILED" ? "#f8d7da" : "#eee" }}>
              <span>{c.numero}</span>
              <div>
                <button onClick={() =>
                  fetch(`${API}/contacts/${c.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: "PENDING", attempts: 0 }),
                  }).then(fetchAll)
                }>♻️</button>

                <button onClick={() => {
                  const numero = prompt("Novo número:", c.numero);
                  if (!numero) return;
                  fetch(`${API}/contacts/${c.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ numero }),
                  }).then(fetchAll);
                }}>✏️</button>

                <button onClick={() =>
                  fetch(`${API}/contacts/${c.id}`, { method: "DELETE" }).then(fetchAll)
                }>❌</button>
              </div>
            </div>
          ))}

          {/* 🔥 PAGINAÇÃO CONTATOS (RESTAURADA) */}
          <div style={styles.pagination}>
            <button onClick={() => setPage(1)}>⏮️</button>
            <button disabled={page === 1} onClick={() => setPage(page - 1)}>⬅️</button>
            <span>{page} / {totalPages || 1}</span>
            <button disabled={page === totalPages} onClick={() => setPage(page + 1)}>➡️</button>
            <button onClick={() => setPage(totalPages)}>⏭️</button>
          </div>

        </div>
      </div>
    </div>
  );
}

/* =========================
   🎨 ESTILOS (SEM ALTERAÇÃO)
========================= */
const styles = {
  container: { fontFamily: "Arial", padding: 30, maxWidth: 500, margin: "0 auto" },
  title: { textAlign: "center" as const },
  card: { background: "#f5f5f5", padding: 20, borderRadius: 10, marginTop: 20 },
  startBtn: { background: "green", color: "#fff", padding: 10, border: "none", marginRight: 10 },
  pauseBtn: { background: "red", color: "#fff", padding: 10, border: "none" },
  qr: { width: 220 },
  connected: { color: "green", fontWeight: "bold" },
  progressBar: { height: 10, background: "#ddd", marginTop: 10 },
  progressFill: { height: "100%", background: "green" },

  sidebarLeft: { position: "fixed" as const, left: 20, top: 20, width: 360 },
  sidebarRight: { position: "fixed" as const, right: 20, top: 20, width: 360 },

  sidebarHeader: { background: "#333", color: "#fff", padding: 10, cursor: "pointer", borderRadius: 8, textAlign: "center" as const },
  sidebarContent: { background: "#fff", marginTop: 5, borderRadius: 8, overflow: "hidden" },

  contactCard: { display: "flex", flexDirection: "column" as const, padding: 10, marginTop: 8, background: "#eee", borderRadius: 8 },
  input: { width: "100%", padding: 8, marginBottom: 10 },
  row: { display: "flex", gap: 5, marginBottom: 10 },
  pagination: { display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 10 },
};