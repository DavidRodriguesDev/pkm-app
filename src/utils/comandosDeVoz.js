// -----------------------------------------------------------------------
// Interpretador de comandos de voz para a tela de Tarefas.
//
// IMPORTANTE — o texto que entra aqui (`fraseOriginal`) vem de uma
// transcrição real (Whisper on-device, via useTranscricao). É um parser
// baseado em regras simples (regex + palavras-chave), não uma IA de
// verdade — então ele foi deixado deliberadamente PERMISSIVO: se não
// reconhecer um verbo de conclusão nem de criação explícito, assume que
// é uma criação de tarefa e tenta extrair título/prazo da frase inteira,
// em vez de desistir. Isso cobre frases naturais tipo "organizar tarefa
// para amanhã às 5 horas", que não começam com "tenho que"/"preciso".
// -----------------------------------------------------------------------

const VERBOS_CONCLUSAO = [
  'realizei',
  'terminei',
  'concluido',
  'conclui',
  'finalizei',
  'ja fiz',
  'acabei de fazer',
  'fiz',
];

// Só usados como PISTA (deixam o parser mais confiante), não como
// exigência — se nenhum bater, ainda cai no fallback de criação lá
// embaixo.
const VERBOS_CRIACAO = [
  'tenho que fazer',
  'preciso fazer',
  'tenho que',
  'preciso de',
  'preciso',
  'lembrar de',
  'anotar que',
  'organizar',
  'criar tarefa',
  'adicionar tarefa',
  'marcar',
  'agendar',
];

// Palavras-chave simples pra chutar a matéria a partir do assunto falado.
// Só reconhece as 3 matérias padrão do app — se o usuário já tiver criado
// matérias personalizadas, o comando de voz não vai saber usá-las (isso é
// uma limitação conhecida do mock, não um bug).
const PALAVRAS_MATERIA = {
  Estudo: ['matematica', 'calculo', 'fisica', 'quimica', 'prova', 'estudar', 'aula', 'exercicio', 'atividade', 'trabalho academico'],
  Trabalho: ['reuniao', 'trabalho', 'projeto', 'relatorio', 'cliente', 'apresentacao', 'email'],
};

// Números por extenso — a transcrição de voz nem sempre vem em dígito
// ("cinco horas" em vez de "5 horas"), principalmente com modelos
// menores de Whisper. Cobre 0-29, que dá conta de praticamente qualquer
// hora do dia falada por extenso.
const NUMEROS_EXTENSO = {
  zero: 0, uma: 1, um: 1, duas: 2, dois: 2, tres: 3, quatro: 4, cinco: 5,
  seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12,
  treze: 13, catorze: 14, quatorze: 14, quinze: 15, dezesseis: 16,
  dezessete: 17, dezoito: 18, dezenove: 19, vinte: 20,
};

function removerAcentos(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Troca números por extenso por dígitos ANTES de rodar as regexes de
// hora/data — assim o resto do parser não precisa saber que existe
// "cinco", só enxerga "5". Cobre "vinte e um" a "vinte e nove" também.
function normalizarNumerosExtenso(textoNorm) {
  let resultado = textoNorm.replace(/\bvinte e (\w+)\b/g, (m, unidade) => {
    const u = NUMEROS_EXTENSO[unidade];
    return u !== undefined && u >= 1 && u <= 9 ? String(20 + u) : m;
  });
  resultado = resultado.replace(/\b(\w+)\b/g, (m) => {
    if (Object.prototype.hasOwnProperty.call(NUMEROS_EXTENSO, m)) {
      return String(NUMEROS_EXTENSO[m]);
    }
    return m;
  });
  return resultado;
}

function addDias(data, n) {
  const d = new Date(data);
  d.setDate(d.getDate() + n);
  return d;
}

function paraISO(data) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
}

function calcularDataRelativa(clausulaNorm) {
  const hoje = new Date();
  if (/depois de amanha/.test(clausulaNorm)) return addDias(hoje, 2);
  if (/amanha/.test(clausulaNorm)) return addDias(hoje, 1);
  if (/\bhoje\b/.test(clausulaNorm)) return addDias(hoje, 0);

  const matchData = clausulaNorm.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (matchData) {
    const dia = Number(matchData[1]);
    const mes = Number(matchData[2]) - 1;
    const anoTexto = matchData[3];
    const ano = anoTexto ? (anoTexto.length === 2 ? 2000 + Number(anoTexto) : Number(anoTexto)) : hoje.getFullYear();
    return new Date(ano, mes, dia);
  }

  return null;
}

function extrairHora(clausulaOriginalNorm) {
  const clausulaNorm = normalizarNumerosExtenso(clausulaOriginalNorm);

  if (/meio[\s-]?dia/.test(clausulaNorm)) return '12:00';
  if (/meia[\s-]?noite/.test(clausulaNorm)) return '00:00';

  // formato explícito HH:MM
  let m = clausulaNorm.match(/(\d{1,2}):(\d{2})/);
  if (m) return `${m[1].padStart(2, '0')}:${m[2]}`;

  // "17h", "5 horas", opcionalmente com minutos e período do dia
  m = clausulaNorm.match(/(\d{1,2})\s*(?:h|horas?)\b(?:\s*(?:e\s*)?(\d{1,2})\s*min\w*)?\s*(da\s*manha|da\s*tarde|da\s*noite)?/);
  if (!m) {
    // "5 da tarde" sem "h"/"horas" no meio
    m = clausulaNorm.match(/\b(\d{1,2})\s*(da\s*manha|da\s*tarde|da\s*noite)\b/);
    if (m) m = [m[0], m[1], null, m[2]];
  }
  if (m) {
    let hora = Number(m[1]);
    const minuto = m[2] ? Number(m[2]) : 0;
    const periodo = m[3];
    if (periodo) {
      if ((periodo.includes('tarde') || periodo.includes('noite')) && hora < 12) hora += 12;
      if (periodo.includes('manha') && hora === 12) hora = 0;
    }
    if (hora >= 0 && hora <= 23 && minuto >= 0 && minuto < 60) {
      return `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`;
    }
  }

  return null;
}

function detectarMateria(textoNorm) {
  for (const [materia, palavras] of Object.entries(PALAVRAS_MATERIA)) {
    if (palavras.some((p) => textoNorm.includes(p))) return materia;
  }
  return 'Pessoal';
}

function extrairDetalhesTarefa(resto) {
  // separa "título" da "cláusula de prazo", cortando no primeiro
  // " até " ou " para " que aparecer
  let titulo = resto;
  let clausula = '';
  const marcador = resto.match(/\s+(até|para)\s+/i);
  if (marcador) {
    titulo = resto.slice(0, marcador.index);
    clausula = resto.slice(marcador.index + marcador[0].length);
  }

  titulo = titulo.replace(/^(uma?|o|a)\s+/i, '').trim();
  titulo = titulo.charAt(0).toUpperCase() + titulo.slice(1);

  const clausulaNorm = removerAcentos(clausula.toLowerCase());
  let prazoData = null;
  if (clausula) {
    const dataRelativa = calcularDataRelativa(clausulaNorm);
    prazoData = dataRelativa ? paraISO(dataRelativa) : null;
  }
  const prazoHora = clausula ? extrairHora(clausulaNorm) : null;

  // se falou uma hora mas não disse o dia, assume "hoje"
  if (!prazoData && prazoHora) prazoData = paraISO(new Date());

  const materiaSugerida = detectarMateria(removerAcentos(resto.toLowerCase()));

  return { titulo, prazoData, prazoHora, materiaSugerida };
}

// Encontra, entre as tarefas ainda não concluídas, a que mais parece com
// o que foi falado — por sobreposição de palavras (bem simples, sem libs
// de fuzzy-match).
function encontrarTarefaParecida(alvo, tarefasAtuais) {
  const alvoNorm = removerAcentos(alvo.toLowerCase());
  const alvoPalavras = alvoNorm.split(/\s+/).filter((p) => p.length > 2);
  if (alvoPalavras.length === 0) return null;

  let melhor = null;
  let melhorPontuacao = 0;
  for (const t of tarefasAtuais) {
    if (t.concluida) continue;
    const tituloNorm = removerAcentos(t.titulo.toLowerCase());
    const pontuacao = alvoPalavras.filter((p) => tituloNorm.includes(p)).length;
    if (pontuacao > melhorPontuacao) {
      melhorPontuacao = pontuacao;
      melhor = t;
    }
  }
  return melhor;
}

// -----------------------------------------------------------------------
// Ponto de entrada. Retorna sempre um objeto com `tipo`:
//   { tipo: 'concluir', tarefaId, tituloEncontrado }
//   { tipo: 'criar', titulo, prazoData, prazoHora, materiaSugerida }
//   { tipo: 'nao_reconhecido', motivo }
// -----------------------------------------------------------------------
export function interpretarComando(fraseOriginal, tarefasAtuais) {
  const fraseNorm = removerAcentos(fraseOriginal.toLowerCase().trim());

  if (!fraseNorm) {
    return { tipo: 'nao_reconhecido', motivo: 'não veio nenhum texto pra interpretar' };
  }

  for (const verbo of VERBOS_CONCLUSAO) {
    const idx = fraseNorm.indexOf(verbo);
    if (idx !== -1) {
      const alvo = fraseOriginal.slice(idx + verbo.length).replace(/^[\s:\-–]+/, '').trim();
      const tarefaEncontrada = encontrarTarefaParecida(alvo, tarefasAtuais);
      if (tarefaEncontrada) {
        return { tipo: 'concluir', tarefaId: tarefaEncontrada.id, tituloEncontrado: tarefaEncontrada.titulo };
      }
      return { tipo: 'nao_reconhecido', motivo: `nenhuma tarefa parecida com "${alvo}" pra marcar como feita` };
    }
  }

  for (const verbo of VERBOS_CRIACAO) {
    const idx = fraseNorm.indexOf(verbo);
    if (idx !== -1) {
      const resto = fraseOriginal.slice(idx + verbo.length).trim();
      if (!resto) continue;
      return { tipo: 'criar', ...extrairDetalhesTarefa(resto) };
    }
  }

  // Fallback: não achou nenhum verbo-gatilho de criação nem de conclusão.
  // Em vez de desistir, assume que é uma criação de tarefa e tenta extrair
  // título/prazo da frase INTEIRA — cobre frases naturais tipo "organizar
  // tarefa para amanhã às 5 horas", que não começam com "tenho que".
  return { tipo: 'criar', ...extrairDetalhesTarefa(fraseOriginal.trim()) };
}