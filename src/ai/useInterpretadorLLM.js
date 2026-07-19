import { useCallback, useEffect, useRef, useState } from 'react';
import { useLLM, models, RnExecutorchError } from 'react-native-executorch';
import { montarPromptSistema, resolverDataPrazo } from './tools';

function normalizar(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function encontrarTarefa(alvo, tarefas) {
  const palavras = normalizar(alvo || '').split(/\s+/).filter((p) => p.length > 2);
  let melhor = null, melhorScore = 0;
  for (const t of tarefas) {
    if (t.concluida) continue;
    const score = palavras.filter((p) => normalizar(t.titulo).includes(p)).length;
    if (score > melhorScore) { melhorScore = score; melhor = t; }
  }
  return melhor;
}

function comTimeout(promise, ms, mensagemErro) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(mensagemErro)), ms)),
  ]);
}

function logarErroDetalhado(prefixo, e) {
  if (e instanceof RnExecutorchError) {
    console.log(`${prefixo} RnExecutorchError | code: ${e.code} | message: ${e.message}`);
  } else {
    console.log(`${prefixo} erro genérico:`, e?.message || e);
  }
}

function extrairJSONDaResposta(texto) {
  if (!texto) return null;

  const idxObjeto = texto.indexOf('{');
  const idxArray = texto.indexOf('[');

  let candidato = null;
  let eraArrayNoTopo = false;

  // O modelo às vezes embrulha a resposta inteira num array [ {...} ] em vez de
  // um objeto solto. Só tratamos como "array no topo" quando o "[" aparece ANTES
  // de qualquer "{" — assim não confundimos com um array que é só um campo interno
  // do objeto (ex: "titulos_concluir": ["a", "b"]).
  if (idxArray !== -1 && (idxObjeto === -1 || idxArray < idxObjeto)) {
    const matchArray = texto.match(/\[[\s\S]*\]/);
    if (matchArray) {
      candidato = matchArray[0];
      eraArrayNoTopo = true;
    }
  }

  if (!candidato) {
    const matchObjeto = texto.match(/\{[\s\S]*\}/);
    candidato = matchObjeto ? matchObjeto[0] : null;
  }

  if (!candidato) return null;

  try {
    const parsed = JSON.parse(candidato);
    if (eraArrayNoTopo && Array.isArray(parsed)) {
      // Resposta válida devia ter só 1 item. Vindo mais de um (às vezes o
      // modelo devolve a lista inteira de "Tarefas abertas" do contexto de
      // volta), não é uma extração de verdade — descarta.
      if (parsed.length !== 1) {
        console.log(`[Parser] resposta veio como lista com ${parsed.length} item(ns) no topo (esperado 1) — provável eco do contexto, descartando.`);
        return null;
      }
      return parsed[0];
    }
    return parsed;
  } catch (e) {
    console.log('[Parser] Falha no JSON.parse:', e.message, 'Texto tentado:', candidato);
    return null;
  }
}

const SINONIMOS_CRIAR = ['criar', 'agendar', 'cadastrar', 'adicionar', 'marcar', 'organizar', 'anotar'];
const SINONIMOS_CONCLUIR = ['concluir', 'finalizar', 'terminar', 'completar', 'concluido', 'feito'];

function normalizarAcao(acao) {
  const a = normalizar(String(acao || '').trim());
  if (SINONIMOS_CRIAR.includes(a)) return 'criar';
  if (SINONIMOS_CONCLUIR.includes(a)) return 'concluir';
  return a;
}

// Sinais fortes no próprio texto falado (mais confiável que adivinhar pela forma do
// JSON quando o campo "acao" vem ausente ou vazio, que é o que estava acontecendo
// nos logs mais recentes — "acao" sumiu e o código sempre chutava "criar").
const SINAIS_TEXTO_CONCLUIR = [
  'conclui', 'concluid', // cobre concluir/conclui/concluída/concluído (já sem acento aqui)
  'realizei', 'realizad',
  'terminei', 'terminad',
  'finalizei', 'finalizad',
  'completei', 'complet',
  'marcar como feito', 'marca como feito', 'marcar como concluid',
  'ja fiz',
];
const SINAIS_TEXTO_CRIAR = [
  'criar uma tarefa', 'criar tarefa', 'nova tarefa',
  'agendar', 'cadastrar', 'adicionar uma tarefa', 'adicionar tarefa',
];

// Sinais de intenção FUTURA ("eu quero fazer", "vou fazer", "preciso fazer") — usados
// só pra desempate quando o modelo diz "concluir" mas o comando claramente fala de
// algo a fazer, não algo já feito. O modelo confunde bastante "realizar" (futuro,
// deveria virar "criar") com "realizei" (passado, "concluir").
const SINAIS_FUTURO_CRIAR = ['quero ', 'vou ', 'preciso ', 'tenho que ', 'gostaria de ', 'necessito '];

function inferirAcaoDoComando(comando) {
  const t = normalizar(comando);
  const temConcluir = SINAIS_TEXTO_CONCLUIR.some((s) => t.includes(s));
  const temCriar = SINAIS_TEXTO_CRIAR.some((s) => t.includes(s));
  if (temConcluir && !temCriar) return 'concluir';
  if (temCriar && !temConcluir) return 'criar';
  return null; // ambíguo ou sem sinal — não arrisca, deixa pro heurístico de fallback
}

function limparHoraPrazo(hora) {
  if (!hora || hora === 'null') return null;
  const match = String(hora).match(/^\d{1,2}:\d{2}/);
  return match ? match[0] : hora;
}

// Confere se o "titulo" que a IA devolveu tem alguma relação com o que a pessoa
// realmente falou. Isso pega os casos em que o modelo "copiou" um valor de exemplo
// (ou de uma resposta anterior) em vez de extrair do comando de verdade.
function tituloPareceReal(titulo, comandoOriginal) {
  if (!titulo) return false;
  const palavras = normalizar(titulo).split(/\s+/).filter((p) => p.length > 3);
  if (palavras.length === 0) return true; // título curto demais (ex: "tarefa") pra validar, deixa passar
  const comandoNorm = normalizar(comandoOriginal || '');
  return palavras.some((p) => comandoNorm.includes(p));
}

// Fallback quando o título da IA não bate com o comando: usa o próprio texto
// falado, removendo os começos mais comuns de comando de criação.
function tituloDeFallback(comandoOriginal) {
  let t = String(comandoOriginal || '').trim();
  const prefixos = [
    /^(cri[ae]?|criar)\s+(uma\s+)?tarefa\s+(de|sobre|para)?\s*/i,
    /^(eu\s+)?(preciso|tenho)\s+(de\s+|que\s+)?(realizar|fazer)\s+(um|uma|o|a)?\s*/i,
    /^(quero|vou)\s+(criar|agendar|marcar|fazer)\s+(uma\s+tarefa\s+)?(de|sobre|para)?\s*/i,
    /^(agendar|marcar|anotar|organizar)\s+(uma\s+tarefa\s+)?(de|sobre|para)?\s*/i,
  ];
  for (const re of prefixos) t = t.replace(re, '');
  return t.trim() || comandoOriginal;
}

// Mesma ideia, mas pra lista de alvos de "concluir": filtra fora qualquer título
// que não tenha nenhuma palavra em comum com o comando, pra não completar uma
// tarefa errada por causa de um valor inventado/copiado pela IA.
function filtrarTitulosReais(titulos, comandoOriginal) {
  return titulos.filter((t) => tituloPareceReal(t, comandoOriginal));
}

export function useInterpretadorLLM() {
  const llm = useLLM({ model: models.llm.lfm2_5_1_2b_instruct() });
  const [estaProcessando, setEstaProcessando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState(null);

  const tarefasAtuaisRef = useRef([]);
  const ultimaRespostaTextoRef = useRef('');

  useEffect(() => {
    const msgs = llm.messageHistory;
    const ultima = msgs[msgs.length - 1];
    if (ultima && ultima.role === 'assistant') {
      ultimaRespostaTextoRef.current = ultima.content;
    }
  }, [llm.messageHistory]);

  useEffect(() => {
    const pct = Math.round((llm.downloadProgress || 0) * 100);
    console.log(`[Interpretador] modelo (LFM2.5 1.2B): ${pct}% | pronto: ${llm.isReady}`);
  }, [llm.downloadProgress, llm.isReady]);

  // A lib só expõe deleteMessage(index), que remove UMA mensagem por vez.
  // Antes o código chamava isso uma única vez (`if (...) llm.deleteMessage(0)`),
  // então o histórico nunca esvaziava de verdade — cada comando adiciona 2 mensagens
  // (user + assistant) e só 1 era removida, sobrando lixo de comandos anteriores
  // "vazando" pro contexto do próximo comando (efeito papagaio / respostas coladas
  // nos exemplos ou em respostas antigas). Aqui limpamos tudo antes de cada novo comando.
  const limparHistoricoCompleto = useCallback(() => {
    const total = llm.messageHistory.length;
    for (let i = 0; i < total; i++) {
      llm.deleteMessage(0);
    }
  }, [llm]);

  const processarAcaoManual = useCallback((jsonParseado, comandoOriginal) => {
    console.log('[Interpretador] JSON validado e extraído:', jsonParseado);

    let acao = normalizarAcao(jsonParseado.acao);

    const temTitulosConcluir = Array.isArray(jsonParseado.titulos_concluir) && jsonParseado.titulos_concluir.length > 0;
    const temTituloTarefa = !!jsonParseado.titulo_tarefa;

    // Só tentamos ADIVINHAR a ação pela forma dos campos quando o modelo não disse
    // claramente "criar" nem "concluir" no campo "acao". Quando ele disse, confiamos
    // nisso — o modelo costuma acertar a INTENÇÃO mesmo errando o formato dos campos
    // (ex: manda o alvo em "titulo" em vez de "titulos_concluir" numa conclusão).
    // Antes o código fazia o contrário (inferia pela forma e sobrescrevia a "acao"),
    // e isso é o que estava transformando "concluir tarefa X" em abrir o modal de criar.
    if (acao !== 'criar' && acao !== 'concluir') {
      const acaoDoTexto = inferirAcaoDoComando(comandoOriginal);
      if (acaoDoTexto) {
        acao = acaoDoTexto;
      } else if (temTitulosConcluir || temTituloTarefa) {
        acao = 'concluir';
      } else if (jsonParseado.titulo) {
        acao = 'criar';
      }
    }

    // Checagem final de sanidade: o modelo às vezes confunde "quero realizar" /
    // "vou fazer" (futuro, é uma CRIAÇÃO) com "realizei" (passado, é CONCLUSÃO) e
    // devolve "acao": "concluir" pra um comando que claramente fala de algo a fazer.
    // Se tem sinal de futuro e nenhum sinal real de conclusão, corrige pra "criar".
    if (acao === 'concluir') {
      const t = normalizar(comandoOriginal);
      const temFuturo = SINAIS_FUTURO_CRIAR.some((s) => t.includes(s));
      const temConclusaoReal = SINAIS_TEXTO_CONCLUIR.some((s) => t.includes(s));
      if (temFuturo && !temConclusaoReal) {
        console.log('[Interpretador] "acao" veio "concluir" mas o comando tem sinal de futuro sem sinal de conclusão — tratando como "criar".');
        acao = 'criar';
        if (!jsonParseado.titulo) {
          const candidato = (Array.isArray(jsonParseado.titulos_concluir) && jsonParseado.titulos_concluir[0])
            || jsonParseado.titulo_tarefa;
          jsonParseado.titulo = candidato || tituloDeFallback(comandoOriginal);
        }
      }
    }

    if (acao === 'criar') {
      if (!jsonParseado.titulo) throw new Error('Faltou o título da tarefa no JSON retornado.');

      let titulo = jsonParseado.titulo;
      if (!tituloPareceReal(titulo, comandoOriginal)) {
        console.log(`[Interpretador] título "${titulo}" não tem relação com o comando — usando o texto original como fallback.`);
        titulo = tituloDeFallback(comandoOriginal);
      }

      let dataPrazo = resolverDataPrazo(jsonParseado.data_prazo);
      let horaPrazo = limparHoraPrazo(jsonParseado.hora_prazo);

      if (!dataPrazo && !horaPrazo && jsonParseado.data_prazo) {
        const pareceHora = String(jsonParseado.data_prazo).match(/^\d{1,2}:\d{2}/);
        if (pareceHora) horaPrazo = pareceHora[0];
      }

      return {
        tipo: 'criar',
        titulo,
        materia: jsonParseado.materia || 'Pessoal',
        dataPrazo,
        horaPrazo,
      };
    }

    if (acao === 'concluir') {
      const tarefas = tarefasAtuaisRef.current;

      // O modelo é inconsistente sobre em qual campo bota o(s) alvo(s): às vezes
      // "titulos_concluir" (array, o formato certo), às vezes "titulo_tarefa",
      // às vezes só "titulo" (o formato de criar). Aceitamos qualquer um.
      const titulosBrutos = [];
      if (Array.isArray(jsonParseado.titulos_concluir)) titulosBrutos.push(...jsonParseado.titulos_concluir);
      if (jsonParseado.titulo_tarefa) titulosBrutos.push(jsonParseado.titulo_tarefa);
      if (jsonParseado.titulo) titulosBrutos.push(jsonParseado.titulo);

      // Descarta qualquer título que não tenha nenhuma palavra em comum com o
      // comando falado — evita concluir a tarefa errada por causa de um valor
      // copiado/inventado pela IA (aqui não tem modal de confirmação no meio).
      const titulosParaBuscar = filtrarTitulosReais(titulosBrutos, comandoOriginal);

      if (titulosParaBuscar.length === 0) {
        throw new Error(`Não entendi qual tarefa concluir em: "${comandoOriginal}"`);
      }

      const idsEncontrados = [];
      for (const tituloAproximado of titulosParaBuscar) {
        const tarefaEncontrada = encontrarTarefa(tituloAproximado, tarefas);
        if (tarefaEncontrada && !idsEncontrados.includes(tarefaEncontrada.id)) {
          idsEncontrados.push(tarefaEncontrada.id);
        }
      }

      if (idsEncontrados.length > 0) {
        return {
          tipo: 'concluir',
          tarefasIds: idsEncontrados
        };
      } else {
        throw new Error(`Não encontrei tarefas abertas parecidas com: ${titulosParaBuscar.join(', ')}`);
      }
    }

    throw new Error(`Ação desconhecida no JSON: ${jsonParseado.acao}`);
  }, []);

  const configuradoTesteRef = useRef(false);

  const testarModeloSemTools = useCallback(async () => {
    try {
      console.log('[Teste] iniciando teste SEM tools...');
      const inicio = Date.now();
      limparHistoricoCompleto();
      if (!configuradoTesteRef.current) {
        llm.configure({
          chatConfig: { systemPrompt: 'Você é um assistente útil. Responda de forma breve. /no_think' },
          generationConfig: { maxTokens: 60, sequenceLength: 512, temperature: 0.3 },
        });
        configuradoTesteRef.current = true;
      }
      await comTimeout(
        llm.sendMessage('Diga oi em uma palavra. /no_think'),
        300000,
        'teste sem tools também travou depois de 5 minutos'
      );
      await new Promise((r) => setTimeout(r, 50));
      const duracao = ((Date.now() - inicio) / 1000).toFixed(1);
      console.log(`[Teste] SEM tools terminou em ${duracao}s. Resposta: "${ultimaRespostaTextoRef.current}"`);
    } catch (e) {
      logarErroDetalhado('[Teste]', e);
    }
  }, [llm, limparHistoricoCompleto]);

  const gerarComando = useCallback(async (texto, tarefasAtuais = [], materiasAtuais = []) => {
    setEstaProcessando(true);
    setResultado(null);
    setErro(null);
    ultimaRespostaTextoRef.current = '';
    tarefasAtuaisRef.current = tarefasAtuais;

    try {
      if (!llm.isReady) throw new Error('modelo de IA ainda carregando');

      limparHistoricoCompleto();

      console.log('[Interpretador] configurando llm para JSON puro...');
      llm.configure({
        chatConfig: {
          systemPrompt: montarPromptSistema(tarefasAtuais, materiasAtuais),
        },
        generationConfig: {
          maxTokens: 120,
          sequenceLength: 1024,
          temperature: 0.0, // determinístico pra não inventar moda
        },
      });

      console.log('[Interpretador] enviando mensagem:', texto);
      const textoFormatado = `Comando: "${texto}"\nSaída JSON: /no_think`;
      await comTimeout(
        llm.sendMessage(textoFormatado),
        240000,
        'O modelo travou ou demorou mais de 4 minutos.'
      );

      await new Promise((r) => setTimeout(r, 50));

      const textoResposta = ultimaRespostaTextoRef.current || '(sem texto)';
      console.log('[Interpretador] Resposta bruta do modelo:', textoResposta);

      const jsonExtraido = extrairJSONDaResposta(textoResposta);

      if (!jsonExtraido) {
        throw new Error(`O modelo não retornou um formato válido. Resposta: "${textoResposta.slice(0, 80)}"`);
      }

      const acaoCapturada = processarAcaoManual(jsonExtraido, texto);

      setResultado(acaoCapturada);
      return acaoCapturada;

    } catch (e) {
      logarErroDetalhado('[Interpretador]', e);
      const msg = e.message || 'erro ao interpretar';
      if (msg.includes('demorou mais de')) {
        try { llm.interrupt(); } catch {}
      }
      setErro(msg);
      return { tipo: 'nao_reconhecido', motivo: msg };
    } finally {
      setEstaProcessando(false);
    }
  }, [llm, processarAcaoManual, limparHistoricoCompleto]);

  return [
    { estaProcessando, resultado, erro, modeloPronto: llm.isReady, progressoModelo: llm.downloadProgress },
    gerarComando,
    testarModeloSemTools,
  ];
}