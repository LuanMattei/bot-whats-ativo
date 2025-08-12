import { WASocket } from "baileys";
import { FormattedMessage } from "../utils/message";

// --- Tipagem de sessão ---
type Session = {
  stage:
    | "awaiting_name"
    | "category"
    | "service_selection"
    | "add_more_service" // novo estágio
    | "awaiting_address"
    | "awaiting_schedule"
    | "confirmed"
    | "ended";
  name?: string;
  category?: string;
  services?: string[];
  address?: string;
  datetime?: string;
  total?: number;
  wantsAtendente?: boolean;
  loyaltyTimer?: NodeJS.Timeout;
  lastMessageId?: string;
};

// Sessões em memória
const sessions: Record<string, Session> = {};
const sendQueues: Record<string, Promise<void>> = {};

// utilitários
const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

const sendWithRetry = async (bot: WASocket, jid: string, message: any, attempt = 1): Promise<void> => {
  try {
    await bot.sendMessage(jid, message);
  } catch (err: any) {
    const isRateLimit = err?.status === 429 || (typeof err?.message === 'string' && err.message.includes('429'));
    if (isRateLimit && attempt <= 5) {
      const delay = Math.pow(2, attempt) * 500;
      await sleep(delay);
      return sendWithRetry(bot, jid, message, attempt + 1);
    }
    console.error('Falha enviando mensagem após retries:', err);
  }
};

const enqueueSend = (bot: WASocket, jid: string, message: any) => {
  const prev = sendQueues[jid] || Promise.resolve();
  sendQueues[jid] = prev
    .catch(() => {}) 
    .then(() => sendWithRetry(bot, jid, message));
  return sendQueues[jid];
};

const normalizarTexto = (texto: any) => {
  if (typeof texto !== 'string') return '';
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

const nomeValido = (nome: string) => {
  return /^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/.test(nome.trim());
};

const encerrarSessao = (jid: string) => {
  const sess = sessions[jid];
  if (sess && sess.loyaltyTimer) clearTimeout(sess.loyaltyTimer);
  delete sessions[jid];
};

const enviarBoasVindas = async (bot: WASocket, jid: string) => {
  await enqueueSend(bot, jid, {
    text: `💖✨ Olá! Seja bem-vindo(a) à Bem Me Care!  
Para começarmos, me conta: qual é o seu nome?`
  });
};

const enviarCategorias = async (bot: WASocket, jid: string, nome: string) => {
  await enqueueSend(bot, jid, {
    text: `Prazer em te atender, ${nome}! Somos especialistas em bem-estar e estética a domicílio.  
Agora, escolha a categoria de serviços que deseja conhecer:  
1️⃣ Massagens  
2️⃣ Unhas  
3️⃣ Cuidados Faciais  
4️⃣ Maquiagem  
5️⃣ Cílios  
6️⃣ Sombrancelha
7️⃣ Falar com atendente`
  });
};

const listarServicosPorCategoria = (categoria: string) => {
  switch (categoria) {
    case '1':
      return `💆‍♀️ *Massagens disponíveis:*  
1. Pedras Quentes – R$ 250  
2. Bam'but'erapia – R$ 180  
3. Desportiva – R$ 100  
4. Relaxante – R$ 150  
5. Escalda Pés – R$ 70 

Digite o número do serviço desejado.`;
    case '2':
      return `💅 *Serviços para unhas:*  
1. Banho de Gel – R$ 100  
2. Esmaltação em Gel – R$ 80  
3. Unhas Clássicas (mão e pé) – R$ 70  
4. Manicure clássica – R$30
5. Pedicure clássica – R$40

Digite o número do serviço desejado.`;
    case '3':
      return `✨ *Cuidados faciais:*  
1. Peeling Vegetal – R$ 120  
2. Limpeza de Pele – R$ 190  

Digite o número do serviço desejado.`;
    case '4':
      return `💄 *Maquiagem:*  
1. Maquiagem Dia a Dia – R$ 120  
2. Maquiagem Festa – R$ 170  
3. Maquiagem Natural – R$ 100 
4. Maquiagem Noiva – R$ 180

Digite o número do serviço desejado.`;
    case '5':
      return `👁️ *Cílios:*  
Por favor descreva o tipo de aplicação ou digite "7" para falar com uma atendente.`;
    case '6':
        return `*Sombrancelha:*
1. Brow lamination – R$ 120
2. Design com tintura natural R$ 50
3. Design com henna R$ 50
4. Design de sobrancelhas R$40    
        `;
    case '7':
      return `👩‍💻 Encaminhando você para uma atendente humana...  
Por favor, aguarde um instante. ⏳`;
    default:
      return null;
  }
};

const precificarServico = (categoria: string, opcao: string): { nome: string; preco: number } | null => {
  if (categoria === '1') {
    switch (opcao) {
      case '1': return { nome: 'Pedras Quentes', preco: 250 };
      case '2': return { nome: 'Bambuterapia', preco: 180 };
      case '3': return { nome: 'Desportiva', preco: 100 };
      case '4': return { nome: 'Relaxante', preco: 150 };
      case '5': return {nome:'Escalda pés', preco:70}
    }
  }
  if (categoria === '2') {
    switch (opcao) {
      case '1': return { nome: 'Banho de Gel', preco: 100 };
      case '2': return { nome: 'Esmaltação em Gel', preco: 80 };
      case '3': return { nome: 'Unhas Clássicas (mão e pé)', preco: 70 };
      case '4': return { nome: 'Manicure clássica', preco: 30 };
      case '5': return { nome: 'Pedicure clássica', preco: 40 };
    }
  }
  if (categoria === '3') {
    switch (opcao) {
      case '1': return { nome: 'Peeling Vegetal', preco: 120 };
      case '2': return { nome: 'Limpeza de Pele', preco: 190 };
    }
  }
  if (categoria === '4') {
    switch (opcao) {
      case '1': return { nome: 'Maquiagem Dia a Dia', preco: 120 };
      case '2': return { nome: 'Maquiagem Festa', preco: 170 };
      case '3': return { nome: 'Maquiagem Natural', preco: 100 };
      case '4': return {nome: 'Maquiagem Noiva', preco: 180}
    } 
  }
  if (categoria ==='6'){
    switch (opcao) {
        case '1' : return{nome:'Brow lamination',preco:65};
        case '2' : return{nome:'Design com tintura natural',preco:50};
        case '3' : return{nome:'Design com henna',preco:50};
        case '4' : return{nome:'Design de sombrancelha',preco:40};
    }
  }
  return null;
};

const MessageHandler = async (bot: WASocket, message: FormattedMessage) => {
  const jid = message.key.remoteJid!;
  if (message.key.fromMe) return;

  if (!sessions[jid]) {
    sessions[jid] = { stage: "awaiting_name" };
    await enviarBoasVindas(bot, jid);
    return;
  }
  const session = sessions[jid];

  const rawText = typeof message.content === 'string' ? message.content : '';
  const textoBruto = rawText.trim();
  const texto = normalizarTexto(textoBruto);

  if (texto === 'encerrar' || texto === 'sair' || texto === 'reiniciar') {
    await enqueueSend(bot, jid, {
      text: `🙏 Agradecemos o seu contato com a Bem Me Care.  
Sessão encerrada. Se quiser recomeçar, é só mandar qualquer mensagem. 💖`
    });
    encerrarSessao(jid);
    return;
  }

  if (session.stage === 'awaiting_name') {
    if (!nomeValido(textoBruto)) {
      await enqueueSend(bot, jid, {
        text: `Ops, esse nome parece conter números, pontos ou caracteres inválidos. Por favor, digite seu nome apenas com letras (ex: Maria Fernanda).`
      });
      return;
    }
    session.name = textoBruto;
    session.stage = 'category';
    await enviarCategorias(bot, jid, session.name);
    return;
  }

  if (session.stage === 'category') {
    if (['1','2','3','4','5','6','7'].includes(texto)) {
      if (texto === '7') {
        session.wantsAtendente = true;
        session.stage = 'ended';
        await enqueueSend(bot, jid, {
          text: `👩‍💻 Certo, estou encaminhando você para uma atendente humana. Em que posso te ajudar?`
        });
        return;
      }
      session.category = texto;
      session.stage = 'service_selection';
      const lista = listarServicosPorCategoria(texto);
      if (lista) {
        await enqueueSend(bot, jid, { text: lista });
      } else {
        session.stage = 'category';
        await enviarCategorias(bot, jid, session.name || '');
      }
      return;
    }
    await enviarCategorias(bot, jid, session.name || '');
    return;
  }

  if (session.stage === 'service_selection') {
    if (!session.category) {
      session.stage = 'category';
      await enviarCategorias(bot, jid, session.name || '');
      return;
    }
    const precoInfo = precificarServico(session.category, texto);
    if (precoInfo) {
      if (!session.services) session.services = [];
      session.services.push(precoInfo.nome);
      session.total = (session.total || 0) + precoInfo.preco;

      session.stage = 'add_more_service';
      await enqueueSend(bot, jid, {
        text: `Você escolheu *${precoInfo.nome}* por R$ ${precoInfo.preco}.  
Deseja adicionar mais algum serviço?  
1️⃣ Sim  
2️⃣ Não`
      });
      return;
    } else if (session.category === '5') {
      if (!session.services) session.services = [];
      session.services.push(textoBruto);
      session.total = session.total || 0;

      session.stage = 'add_more_service';
      await enqueueSend(bot, jid, {
        text: `Você escolheu *${textoBruto}* para cílios.  
Deseja adicionar mais algum serviço?  
1️⃣ Sim  
2️⃣ Não`
      });
      return;
    }
    await enqueueSend(bot, jid, {
      text: `Não reconheci esse serviço. Por favor digite o número correto da lista ou "reiniciar" para começar de novo.`
    });
    return;
  }

  if (session.stage === 'add_more_service') {
    if (texto === '1' || texto === 'sim') {
      session.stage = 'category';
      await enviarCategorias(bot, jid, session.name || '');
      return;
    }
    if (texto === '2' || texto === 'nao' || texto === 'não') {
      session.stage = 'awaiting_address';
      await enqueueSend(bot, jid, {
        text: `Perfeito, ${session.name}! Agora me informe o endereço completo (rua, bairro, número e CEP) onde deseja o atendimento.  
Lembrando: todos os nossos serviços são a domicílio 🚗✨`
      });
      return;
    }
    await enqueueSend(bot, jid, {
      text: `Responda:  
1️⃣ Sim — para adicionar mais serviços  
2️⃣ Não — para seguir com o agendamento`
    });
    return;
  }

  if (session.stage === 'awaiting_address') {
    const endereco = textoBruto;
    if (endereco.length < 10) {
      await enqueueSend(bot, jid, {
        text: `Parece que o endereço está incompleto. Por favor, informe o endereço completo (rua, bairro, número e CEP).`
      });
      return;
    }
    session.address = endereco;
    session.stage = 'awaiting_schedule';
    await enqueueSend(bot, jid, {
      text: `Ótimo, ${session.name}! Agora, para finalizar, clique no link abaixo e escolha o dia e horário disponível:  
👉 [Link da Agenda Online]`
    });
    return;
  }

  if (session.stage === 'awaiting_schedule') {
    session.datetime = textoBruto;
    session.stage = 'confirmed';
    const resumoServicos = session.services?.join(', ') || '—';
    const totalFormatado = session.total ? `R$ ${session.total}` : 'A combinar';
    await enqueueSend(bot, jid, {
      text: `🎉 *Atendimento confirmado!*  
Resumo:  
• Serviços: ${resumoServicos}  
• Data/Horário: ${session.datetime}  
• Endereço: ${session.address}  
Total: ${totalFormatado}  

Caso tenha alguma dúvida, digite 7 para falar com nossa atendente 💖`
    });
    if (!session.wantsAtendente) {
      session.loyaltyTimer = setTimeout(async () => {
        const current = sessions[jid];
        if (current && current.stage === 'confirmed' && !current.wantsAtendente) {
          await enqueueSend(bot, jid, {
            text: `💖 Obrigada pela confiança, ${current.name}! Foi um prazer levar cuidado e bem-estar até você.  
Queremos te ver mais vezes por aqui ✨  
Deixe sua avaliação clicando aqui 👉 [link do Google/Instagram]  
🎁 Clientes fiéis Bem Me Care ganham descontos e benefícios exclusivos. Até a próxima!`
          });
        }
      }, 2 * 60 * 1000);
    }
    return;
  }

  if (session.stage === 'confirmed') {
    if (texto === '7') {
      session.wantsAtendente = true;
      await enqueueSend(bot, jid, {
        text: `👩‍💻 Claro, transferindo para uma atendente. Como posso te ajudar?`
      });
      return;
    }
    await enqueueSend(bot, jid, {
      text: `Se precisar de algo, digite 7 para falar com uma atendente ou "sair" para encerrar.`
    });
    return;
  }
};

export default MessageHandler;
