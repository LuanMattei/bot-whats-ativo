let sentInHour = 0;
let startHour = Date.now();
let totalSent = 0; // 🔥 controle total (importante pro aquecimento)

// Helpers
function getRandom(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Limite dinâmico
let hourlyLimit = getRandom(30, 50); // 🔽 mais conservador

export const smartControlDelay = async (): Promise<void> => {
  const now = Date.now();

  // 🔄 Reset com janela variável (55 a 75 min)
  if (now - startHour >= getRandom(55, 75) * 60000) {
    sentInHour = 0;
    startHour = now;
    hourlyLimit = getRandom(30, 50);

    console.log("🔄 Reset contador por hora");
  }

  // 🛑 Limite por hora
  if (sentInHour >= hourlyLimit) {
    const pause = getRandom(20, 40) * 60000; // 🔥 pausa maior

    console.log(`🛑 Limite atingido (${hourlyLimit}/h). Pausando ${pause / 60000} min...`);

    await sleep(pause);

    sentInHour = 0;
    startHour = Date.now();
    hourlyLimit = getRandom(30, 50);
  }

  // =========================
  // 🔥 FASE 1: AQUECIMENTO (primeiros 20 envios)
  // =========================
  let time: number;

  if (totalSent < 20) {
    time = getRandom(60000, 120000); // 1 a 2 min
  }

  // =========================
  // ⚖️ FASE 2: NORMAL (20 - 100)
  // =========================
  else if (totalSent < 100) {
    const rand = Math.random();

    if (rand < 0.6) {
      time = getRandom(40000, 70000);
    } else if (rand < 0.9) {
      time = getRandom(70000, 120000);
    } else {
      time = getRandom(20000, 35000);
    }
  }

  // =========================
  // 🛑 FASE 3: FADIGA (100+ contatos)
  // =========================
  else {
    const rand = Math.random();

    if (rand < 0.5) {
      time = getRandom(60000, 120000);
    } else {
      time = getRandom(120000, 180000); // até 3 min
    }

    // 🔥 pausas longas mais frequentes
    if (Math.random() < 0.25) {
      const extraPause = getRandom(5, 10) * 60000;
      console.log(`🛑 Pausa longa (fadiga) de ${extraPause / 60000} min...`);
      await sleep(extraPause);
    }
  }

  // ☕ pausas humanas globais
  if (Math.random() < 0.15) {
    const extraPause = getRandom(3, 8) * 60000;
    console.log(`☕ Pausa humana de ${extraPause / 60000} min...`);
    await sleep(extraPause);
  }

  sentInHour++;
  totalSent++;

  console.log(`📤 Enviadas na hora: ${sentInHour}/${hourlyLimit}`);
  console.log(`📊 Total enviado: ${totalSent}/160`);
  console.log(`⏳ Aguardando ${Math.floor(time / 1000)}s...`);

  await sleep(time);
};