import { useEffect, useState } from "react";

export default function App() {
  const API = "http://localhost:3000";

  const [qr, setQr] = useState("");
  const [connected, setConnected] = useState(false);
  const [running, setRunning] = useState(false);
  const [sent, setSent] = useState(0);
  const [total, setTotal] = useState(0);

  const [contacts, setContacts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [newNumber, setNewNumber] = useState("");

  const [messages, setMessages] = useState<string[]>([]);
  const [newMsg, setNewMsg] = useState("");

  const [showMessages, setShowMessages] = useState(true);
  const [showContacts, setShowContacts] = useState(true);

  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  const fetchAll = async () => {
    const [s, q, c, m] = await Promise.all([
      fetch(`${API}/status`).then(r => r.json()),
      fetch(`${API}/qr`).then(r => r.json()),
      fetch(`${API}/contacts`).then(r => r.json()),
      fetch(`${API}/messages`).then(r => r.json()),
    ]);

    setRunning(s.running);
    setConnected(s.connected);
    setSent(s.sent || 0);
    setTotal(s.total || 0);

    setQr(q.qr);
    setContacts(c);
    setMessages(m);
  };

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 3000);
    return () => clearInterval(interval);
  }, []);

  const start = async () => await fetch(`${API}/start`, { method: "POST" });
  const pause = async () => await fetch(`${API}/pause`, { method: "POST" });

  const addContact = async () => {
    if (!newNumber) return;
    await fetch(`${API}/contacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ numero: newNumber }),
    });
    setNewNumber("");
    fetchAll();
  };

  const deleteContact = async (id: string) => {
    await fetch(`${API}/contacts/${id}`, { method: "DELETE" });
    fetchAll();
  };

  const editContact = async (id: string) => {
    const numero = prompt("Novo número:");
    if (!numero) return;
    await fetch(`${API}/contacts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ numero }),
    });
    fetchAll();
  };

  const resetOne = async (id: string) => {
    await fetch(`${API}/contacts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PENDING", attempts: 0 }),
    });
    fetchAll();
  };

  const resetAll = async () => {
    await fetch(`${API}/contacts/reset`, { method: "POST" });
    fetchAll();
  };

  const addMessage = async () => {
    if (!newMsg) return;
    await fetch(`${API}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: newMsg }),
    });
    setNewMsg("");
    fetchAll();
  };

  const deleteMessage = async (i: number) => {
    await fetch(`${API}/messages/${i}`, { method: "DELETE" });
    fetchAll();
  };

  const editMessage = async (i: number) => {
    const msg = prompt("Editar mensagem:", messages[i]);
    if (!msg) return;
    await fetch(`${API}/messages/${i}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg }),
    });
    fetchAll();
  };

  const filtered = contacts.filter(c => c.numero.includes(search));
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  const progress = total > 0 ? (sent / total) * 100 : 0;

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>📲 Painel WhatsApp</h1>

      <div style={styles.card}>
        <p>Status: <strong style={{ color: running ? "green" : "red" }}>{running ? "Rodando" : "Parado"}</strong></p>
        <p>📤 {sent} / {total}</p>
        <div style={styles.progressBar}>
          <div style={{ ...styles.progressFill, width: `${progress}%` }} />
        </div>
      </div>

      <div style={styles.card}>
        <button onClick={start} style={styles.startBtn}>🚀 Iniciar</button>
        <button onClick={pause} style={styles.pauseBtn}>⏸️ Pausar</button>
      </div>

      <div style={styles.card}>
        {connected ? <p style={styles.connected}>🟢 Conectado</p> : qr ? <img src={qr} style={styles.qr} /> : <p>Aguardando QR...</p>}
      </div>

      {/* MENSAGENS */}
      <div style={styles.sidebarLeft}>
        <div style={styles.sidebarHeader} onClick={() => setShowMessages(!showMessages)}>
          💬 Mensagens ({messages.length})
        </div>

        <div style={{ ...styles.sidebarContent, maxHeight: showMessages ? 500 : 0, opacity: showMessages ? 1 : 0 }}>
          <div style={styles.row}>
            <input value={newMsg} onChange={(e) => setNewMsg(e.target.value)} style={styles.input} />
            <button onClick={addMessage}>➕</button>
          </div>

          {messages.map((msg, i) => (
            <div key={i} style={styles.contactCard}>
              <p>{msg}</p>
              <div>
                <button onClick={() => editMessage(i)}>✏️</button>
                <button onClick={() => deleteMessage(i)}>❌</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CONTATOS */}
      <div style={styles.sidebarRight}>
        <div style={styles.sidebarHeader} onClick={() => setShowContacts(!showContacts)}>
          📇 Contatos ({contacts.length})
        </div>

        <div style={{ ...styles.sidebarContent, maxHeight: showContacts ? 500 : 0, opacity: showContacts ? 1 : 0 }}>
          <input value={search} onChange={(e) => setSearch(e.target.value)} style={styles.input} />

          <div style={styles.row}>
            <input value={newNumber} onChange={(e) => setNewNumber(e.target.value)} style={styles.input} />
            <button onClick={addContact}>➕</button>
          </div>

          <button onClick={resetAll}>🔄 Resetar TODOS</button>

          {paginated.map((c) => (
            <div
  key={c.id}
  style={{
    ...styles.contactCard,
    background:
      c.status === "SENT"
        ? "#d4edda"   // verde
        : c.status === "FAILED"
        ? "#f8d7da"   // vermelho
        : "#eee",     // cinza (PENDING)
  }}
>
              <span>{c.numero}</span>
              <div>
                <button onClick={() => resetOne(c.id)}>♻️</button>
                <button onClick={() => editContact(c.id)}>✏️</button>
                <button onClick={() => deleteContact(c.id)}>❌</button>
              </div>
            </div>
          ))}

          <div style={styles.pagination}>
            <button disabled={page === 1} onClick={() => setPage(page - 1)}>⬅️</button>
            <span>{page} / {totalPages || 1}</span>
            <button disabled={page === totalPages} onClick={() => setPage(page + 1)}>➡️</button>
          </div>
        </div>
      </div>
    </div>
  );
}

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

  sidebarLeft: { position: "fixed" as const, left: 20, top: 20, width: 300 },
  sidebarRight: { position: "fixed" as const, right: 20, top: 20, width: 300 },

  sidebarHeader: { background: "#333", color: "#fff", padding: 10, cursor: "pointer", borderRadius: 8, textAlign: "center" as const },
  sidebarContent: { background: "#fff", marginTop: 5, borderRadius: 8, overflow: "hidden", transition: "all 0.3s ease" },

  contactCard: { display: "flex", justifyContent: "space-between", padding: 10, marginTop: 8, background: "#eee" },
  input: { width: "100%", padding: 8, marginBottom: 10 },
  row: { display: "flex", gap: 5, marginBottom: 10 },
  pagination: { display: "flex", justifyContent: "space-between", marginTop: 10 },
};
