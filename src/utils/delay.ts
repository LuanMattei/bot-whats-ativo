let sentInHour = 0;
let startHour = Date.now();

// ✅ Helpers (usar function é melhor aqui por causa do hoisting)
function getRandom(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ✅ Limite dinâmico por hora
let hourlyLimit = getRandom(40, 60);

export const smartControlDelay = async (): Promise<void> => {
  const now = Date.now();

  // 🔄 Reset com janela variável (50 a 70 min)
  if (now - startHour >= getRandom(50, 70) * 60000) {
    sentInHour = 0;
    startHour = now;
    hourlyLimit = getRandom(40, 60);

    console.log("🔄 Reset contador por hora");
  }

  // 🛑 Limite atingido → pausa longa variável
  if (sentInHour >= hourlyLimit) {
    const pause = getRandom(10, 25) * 60000;

    console.log(`🛑 Limite atingido (${hourlyLimit}/h). Pausando ${pause / 60000} min...`);

    await sleep(pause);

    sentInHour = 0;
    startHour = Date.now();
    hourlyLimit = getRandom(40, 60);
  }

  // 🧠 Delay mais humano
  let time: number;
  const rand = Math.random();

  if (rand < 0.7) {
    time = getRandom(25000, 40000);
  } else if (rand < 0.9) {
    time = getRandom(40000, 70000);
  } else {
    time = getRandom(10000, 20000);
  }

  // ☕ Pausas humanas
  if (Math.random() < 0.1) {
    const extraPause = getRandom(2, 5) * 60000;
    console.log(`☕ Pausa humana de ${extraPause / 60000} min...`);
    await sleep(extraPause);
  }

  sentInHour++;

  console.log(`📤 Enviadas na hora: ${sentInHour}/${hourlyLimit}`);
  console.log(`⏳ Aguardando ${Math.floor(time / 1000)}s...`);

  await sleep(time);
};