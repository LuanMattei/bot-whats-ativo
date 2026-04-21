let sentInHour = 0;
let startHour = Date.now();
let totalSent = 0;

// Helpers
function getRandom(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Limite dinâmico (um pouco mais flexível)
let hourlyLimit = getRandom(40, 60);

export const smartControlDelay = async (): Promise<void> => {
  const now = Date.now();

  // 🔄 Reset com janela variável (55 a 75 min)
  if (now - startHour >= getRandom(55, 75) * 60000) {
    sentInHour = 0;
    startHour = now;
    hourlyLimit = getRandom(40, 60);

    console.log("🔄 Reset contador por hora");
  }

  // 🛑 Limite por hora
  if (sentInHour >= hourlyLimit) {
    const pause = getRandom(15, 30) * 60000;

    console.log(`🛑 Limite atingido (${hourlyLimit}/h). Pausando ${pause / 60000} min...`);

    await sleep(pause);

    sentInHour = 0;
    startHour = Date.now();
    hourlyLimit = getRandom(40, 60);
  }

  // =========================
  // ⏱️ DEFINIÇÃO DE TEMPO
  // =========================
  let time: number;

  // 🔥 FASE 1: AQUECIMENTO (rápido)
  if (totalSent < 20) {
    time = getRandom(8000, 20000); // 8s a 20s
  }

  // ⚖️ FASE 2: NORMAL
  else if (totalSent < 100) {
    const rand = Math.random();

    if (rand < 0.6) {
      time = getRandom(20000, 40000);
    } else if (rand < 0.9) {
      time = getRandom(40000, 70000);
    } else {
      time = getRandom(10000, 20000);
    }
  }

  // 🛑 FASE 3: FADIGA
  else {
    const rand = Math.random();

    if (rand < 0.5) {
      time = getRandom(40000, 80000);
    } else {
      time = getRandom(80000, 140000);
    }

    // pausas longas só aqui
    if (Math.random() < 0.15) {
      const extraPause = getRandom(3, 6) * 60000;
      console.log(`🛑 Pausa longa (fadiga) de ${extraPause / 60000} min...`);
      await sleep(extraPause);
    }
  }

  // ☕ pausas humanas (só depois de aquecer)
  if (totalSent > 15 && Math.random() < 0.10) {
    const extraPause = getRandom(2, 5) * 60000;
    console.log(`☕ Pausa humana de ${extraPause / 60000} min...`);
    await sleep(extraPause);
  }

  sentInHour++;
  totalSent++;

  console.log(`📤 Enviadas na hora: ${sentInHour}/${hourlyLimit}`);
  console.log(`📊 Total enviado: ${totalSent}`);
  console.log(`⏳ Próximo envio em ${Math.floor(time / 1000)}s...`);

  await sleep(time);
};