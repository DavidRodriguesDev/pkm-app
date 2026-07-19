const DIAS_SEMANA = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
const MESES = {
  janeiro: 1, fevereiro: 2, marco: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
};

function semAcento(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function formatarISO(data) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
}

export function resolverDataPrazo(valor, dataReferencia = new Date()) {
  if (!valor || valor === 'null') return null;
  const texto = semAcento(String(valor).trim());
  const isoMatch = texto.match(/^\d{4}-\d{2}-\d{2}/);
  if (isoMatch) return isoMatch[0];
  const hoje = new Date(dataReferencia);
  hoje.setHours(0, 0, 0, 0);
  if (texto.includes('depois de amanha')) {
    const d = new Date(hoje); d.setDate(d.getDate() + 2); return formatarISO(d);
  }
  if (texto.includes('amanha')) {
    const d = new Date(hoje); d.setDate(d.getDate() + 1); return formatarISO(d);
  }
  if (texto.includes('hoje')) return formatarISO(hoje);
  const matchDias = texto.match(/(?:em|daqui a|dentro de)\s+(\d{1,2})\s+dias?|(\d{1,2})\s+dias?\s+(?:a partir de hoje|a partir de agora)/);
  if (matchDias) {
    const n = parseInt(matchDias[1] || matchDias[2], 10);
    if (n > 0) {
      const d = new Date(hoje); d.setDate(d.getDate() + n); return formatarISO(d);
    }
  }
  for (let i = 0; i < DIAS_SEMANA.length; i++) {
    if (texto.includes(DIAS_SEMANA[i])) {
      const d = new Date(hoje);
      let diff = (i - d.getDay() + 7) % 7;
      if (diff === 0) diff = 7;
      d.setDate(d.getDate() + diff);
      return formatarISO(d);
    }
  }
  const matchDiaMes = texto.match(/(?:dia\s+)?(\d{1,2})\s+(?:de|do)\s+(?:mes\s+)?([a-z]+|\d{1,2})/);
  if (matchDiaMes) {
    const dia = parseInt(matchDiaMes[1], 10);
    const mesTexto = matchDiaMes[2];
    const mes = /^\d+$/.test(mesTexto) ? parseInt(mesTexto, 10) : MESES[mesTexto];
    if (dia && mes) {
      let ano = hoje.getFullYear();
      if (new Date(ano, mes - 1, dia) < hoje) ano += 1;
      return formatarISO(new Date(ano, mes - 1, dia));
    }
  }
  return null;
}

// Sinônimos usados tanto para o prompt quanto para a detecção local de "concluir tudo"
export const SINONIMOS_CONCLUIR = ['concluir', 'finalizar', 'terminar', 'completar', 'concluido', 'feito', 'realizei', 'realizado', 'terminei', 'finalizei'];
const PALAVRAS_TUDO = ['todas', 'todos', 'tudo'];

// Detecta comandos tipo "concluir todas as tarefas pendentes" / "terminei tudo" ANTES de mandar pro LLM.
// Isso existe porque pedir pro modelo pequeno listar manualmente o título de cada tarefa aberta
// é frágil (ele não tem visão de "selecionar todos os itens de uma lista"), então resolvemos
// essa intenção localmente, sem depender da IA.
export function pareceConcluirTudo(texto) {
  const t = semAcento(texto);
  const temConcluir = SINONIMOS_CONCLUIR.some((p) => t.includes(p));
  const temTudo = PALAVRAS_TUDO.some((p) => t.includes(p));
  return temConcluir && temTudo;
}

// Verbos de conclusão em forma de raiz, pra pegar conjugações (concluí, concluída,
// realizei, terminei...) sem precisar listar cada uma.
const RAIZES_CONCLUIR_TEXTO = ['conclu', 'realiz', 'termin', 'finaliz', 'complet'];

// Ordinais medidos a partir do INÍCIO da lista (posição 0 = primeira tarefa exibida
// na tela, que é a mais recente, já que a lista vem ordenada por mais nova primeiro).
const ORDINAIS_DO_INICIO = [
  { regex: /\bprimeir[ao]\b/, posicao: 0 },
  { regex: /\bsegund[ao]\b/, posicao: 1 },
  { regex: /\bterceir[ao]\b/, posicao: 2 },
  { regex: /\bquart[ao]\b/, posicao: 3 },
  { regex: /\bquint[ao]\b/, posicao: 4 },
  { regex: /\bsext[ao]\b/, posicao: 5 },
  { regex: /\bsetim[ao]\b/, posicao: 6 },
  { regex: /\boitav[ao]\b/, posicao: 7 },
  { regex: /\bnon[ao]\b/, posicao: 8 },
  { regex: /\bdecim[ao]\b/, posicao: 9 },
];

// Ordinais medidos a partir do FIM da lista (a mais antiga pendente).
const ORDINAIS_DO_FIM = [
  { regex: /\bultim[ao]\b/, distanciaDoFim: 0 },
  { regex: /\bpenultim[ao]\b/, distanciaDoFim: 1 },
  { regex: /\bantepenultim[ao]\b/, distanciaDoFim: 2 },
];

// Detecta comandos tipo "a primeira tarefa foi concluída" / "concluir a segunda e a
// última tarefa" ANTES de mandar pro LLM. Um modelo de 1.2B não conta posição em lista
// de forma confiável, então resolvemos isso localmente. Devolve os ÍNDICES (0-based),
// na mesma ordem em que aparecem na tela, ou [] se o comando não bater com esse padrão.
//
// Aviso: "segunda", "quarta", "quinta" e "sexta" também são nomes de dia da semana em
// português, então em frases ambíguas tipo "concluir a tarefa de sexta" isso pode
// interpretar errado como "6ª tarefa" em vez de "tarefa de sexta-feira". É um limite
// conhecido dessa abordagem baseada em texto, não um bug.
export function extrairIndicesOrdinaisDeConclusao(texto, totalPendentes) {
  if (!totalPendentes) return [];
  const t = semAcento(texto);

  const temConcluir = RAIZES_CONCLUIR_TEXTO.some((r) => t.includes(r));
  const mencionaTarefa = t.includes('tarefa');
  if (!temConcluir || !mencionaTarefa) return [];

  const indices = new Set();
  for (const { regex, posicao } of ORDINAIS_DO_INICIO) {
    if (regex.test(t) && posicao < totalPendentes) indices.add(posicao);
  }
  for (const { regex, distanciaDoFim } of ORDINAIS_DO_FIM) {
    if (regex.test(t)) {
      const idx = totalPendentes - 1 - distanciaDoFim;
      if (idx >= 0) indices.add(idx);
    }
  }

  return [...indices].sort((a, b) => a - b);
}

export function montarPromptSistema(tarefasEmAberto = [], materiasCadastradas = []) {
  const dataHoje = new Date();
  const dataHoraAtual = `${dataHoje.getFullYear()}-${String(dataHoje.getMonth() + 1).padStart(2, '0')}-${String(dataHoje.getDate()).padStart(2, '0')} ${String(dataHoje.getHours()).padStart(2, '0')}:${String(dataHoje.getMinutes()).padStart(2, '0')}`;
  const materiasTexto = materiasCadastradas.length > 0
    ? materiasCadastradas.map((m) => m.nome).join(', ')
    : 'Trabalho, Estudo, Pessoal';

  // Propositalmente NÃO listamos as tarefas existentes aqui. Quem encontra a tarefa
  // certa pra concluir é o app (busca fuzzy em `encontrarTarefa`, usando o título que
  // a IA extrair) — a IA não precisa ver a lista pra fazer esse trabalho. Incluir a
  // lista só dava ao modelo algo pra "copiar" quando ficava confuso com um comando
  // mal transcrito, e ele devolvia uma tarefa antiga em vez de interpretar o comando
  // atual. Menos contexto = menos chance de um modelo pequeno se perder nele.
  return `Você é um robô de extração de dados JSON. Sua única fonte de informação é o Comando abaixo. Você NÃO tem acesso a tarefas já existentes nem a comandos anteriores — analise somente o que está escrito no Comando de agora.
Data atual: ${dataHoraAtual}
Matérias permitidas: ${materiasTexto}

INSTRUÇÕES:
Leia o Comando e gere o JSON correspondente, extraindo os dados REAIS do Comando.
Os exemplos abaixo mostram só o FORMATO da resposta. Os valores de "titulo", "materia", "data_prazo" e "hora_prazo" de cada exemplo pertencem SOMENTE àquele exemplo — copiar qualquer um deles na sua resposta é um ERRO GRAVE. Se o assunto do Comando não estiver claro, use uma palavra-chave do PRÓPRIO Comando como título, nunca o título de um exemplo.
Para "concluir", use sempre o campo "titulos_concluir" (uma lista, mesmo com um item só).

EXEMPLO 1
Comando: "preciso terminar o relatório de vendas até sexta às 18 horas."
Saída JSON: {"acao": "criar", "titulo": "relatório de vendas", "materia": "Trabalho", "data_prazo": "sexta", "hora_prazo": "18:00"}

EXEMPLO 2 (note que título, matéria, data e hora são todos diferentes do exemplo 1)
Comando: "marcar uma consulta no dentista pro dia 20 de agosto de manhã."
Saída JSON: {"acao": "criar", "titulo": "consulta no dentista", "materia": "Pessoal", "data_prazo": "20 de agosto", "hora_prazo": null}

EXEMPLO 3
Comando: "já paguei a conta de luz."
Saída JSON: {"acao": "concluir", "titulos_concluir": ["conta de luz"]}

EXEMPLO 4
Comando: "terminei de revisar a apostila de física e de ligar pro fornecedor."
Saída JSON: {"acao": "concluir", "titulos_concluir": ["revisar a apostila de física", "ligar pro fornecedor"]}

Responda APENAS com o JSON, sem texto antes ou depois. Siga estritamente o formato acima. /no_think`;
}