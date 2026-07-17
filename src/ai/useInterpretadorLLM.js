import { useCallback, useEffect, useRef, useState } from 'react';
import { useLLM, HAMMER2_1_1_5B } from 'react-native-executorch';
import { toolsInterpretador, montarPromptSistema } from './tools';

function normalizar(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
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

// Corre uma promise contra um limite de tempo — se o modelo travar (loop
// de geração sem fim, tool call mal formado, etc.) isso evita que a tela
// fique presa em "INTERPRETANDO COM IA..." pra sempre e devolve um erro
// que dá pra ver e reportar.
function comTimeout(promise, ms, mensagemErro) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(mensagemErro)), ms)),
  ]);
}

// Interpretador de comandos de voz em linguagem livre, usando o modo
// "managed" do useLLM (configure + toolsConfig.executeToolCallback +
// sendMessage).
//
// Referência: https://docs.swmansion.com/react-native-executorch/docs/hooks/natural-language-processing/useLLM
export function useInterpretadorLLM() {
  // Testamos Qwen3 4B e Qwen3 0.6B — nenhum dos dois chamou a tool
  // corretamente (o chat template deles, pelo menos como exportado nessa
  // lib, não parece lidar bem com tool calling). Trocando pro Hammer 2.1,
  // que é o modelo usado nos próprios exemplos oficiais de tool calling
  // da lib — é treinado especificamente pra isso, e além disso é bem
  // menor que o Qwen3 4B (mais rápido no celular).
  const llm = useLLM({ model: HAMMER2_1_1_5B });
  const [estaProcessando, setEstaProcessando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState(null);

  // O `llm` que a função gerarComando enxerga é uma "foto" de um render
  // específico — ler llm.response depois de um await, na mesma função,
  // pode devolver um valor obsoleto (o componente já re-renderizou com
  // um texto novo, mas essa cópia local não sabe disso). Refs não têm
  // esse problema: são o mesmo objeto entre renders, então um efeito que
  // atualiza `.current` sempre que o estado reativo muda deixa o valor
  // sempre acessível e atualizado de dentro de gerarComando.
  const capturadoRef = useRef(null);
  const tarefasAtuaisRef = useRef([]);
  const ultimaRespostaTextoRef = useRef('');

  useEffect(() => {
    const msgs = llm.messageHistory;
    console.log('[Interpretador] messageHistory mudou:', JSON.stringify(msgs));
    const ultima = msgs[msgs.length - 1];
    if (ultima && ultima.role === 'assistant') {
      ultimaRespostaTextoRef.current = ultima.content;
    }
  }, [llm.messageHistory]);

  const executarTool = useCallback(async (call) => {
    // LOG DE DIAGNÓSTICO: se isso nunca aparecer no terminal, o modelo
    // não está conseguindo chamar a tool.
    console.log('[Interpretador] tool chamada:', call.toolName, JSON.stringify(call));

    // Os exemplos oficiais mais recentes usam `call.parameters`; alguns
    // exemplos antigos usavam `call.arguments`. Cobrindo os dois.
    const args = call.parameters || call.arguments || {};

    if (call.toolName === 'criar_tarefa') {
      if (!args.titulo) return 'faltou o título da tarefa, pergunte de novo pro usuário';
      capturadoRef.current = {
        tipo: 'criar',
        titulo: args.titulo,
        materia: args.materia || 'Pessoal',
        dataPrazo: args.data_prazo || null,
        horaPrazo: args.hora_prazo || null,
      };
      return 'tarefa capturada, aguardando confirmação do usuário';
    }

    if (call.toolName === 'concluir_tarefa') {
      const tarefas = tarefasAtuaisRef.current;
      const porId = tarefas.find((t) => t.id === args.tarefa_id);
      const tarefa = porId || encontrarTarefa(args.titulo_tarefa || '', tarefas);

      if (!tarefa) {
        return `não encontrei nenhuma tarefa em aberto parecida com "${args.titulo_tarefa || args.tarefa_id}"`;
      }

      capturadoRef.current = { tipo: 'concluir', tarefaId: tarefa.id, tituloEncontrado: tarefa.titulo };
      return `ok, tarefa "${tarefa.titulo}" marcada para conclusão`;
    }

    return null;
  }, []);

  const gerarComando = useCallback(async (texto, tarefasAtuais = [], materiasAtuais = []) => {
    setEstaProcessando(true);
    setResultado(null);
    setErro(null);
    capturadoRef.current = null;
    ultimaRespostaTextoRef.current = '';
    tarefasAtuaisRef.current = tarefasAtuais;

    try {
      if (!llm.isReady) throw new Error('modelo de IA ainda carregando');

      // Reseta a conversa a cada comando novo — não queremos que o
      // contexto de um comando anterior influencie o próximo; o system
      // prompt (com data/tarefas atuais) já é remontado do zero abaixo.
      if (llm.messageHistory.length > 0) {
        llm.deleteMessage(0);
      }

      console.log('[Interpretador] configurando llm...');
      llm.configure({
        chatConfig: {
          systemPrompt: montarPromptSistema(tarefasAtuais, materiasAtuais),
        },
        toolsConfig: {
          tools: toolsInterpretador,
          executeToolCallback: executarTool,
          displayToolCalls: false,
        },
      });

      console.log('[Interpretador] enviando mensagem:', texto);
      // TEMPORÁRIO pra diagnóstico: 5 minutos em vez de 60s, só pra
      // confirmar se o modelo eventualmente termina (emulador sem
      // aceleração de hardware pode ser bem mais lento que um celular
      // físico). Depois de confirmar, volta pra um valor tipo 60000-90000.
      await comTimeout(
        llm.sendMessage(texto),
        300000,
        'o modelo demorou mais de 5 minutos pra responder'
      );

      // Pequena folga pra garantir que o efeito que observa
      // messageHistory já rodou e atualizou ultimaRespostaTextoRef.
      await new Promise((r) => setTimeout(r, 50));

      console.log(
        '[Interpretador] sendMessage resolvido. capturado =', capturadoRef.current,
        '| última resposta =', ultimaRespostaTextoRef.current
      );

      if (capturadoRef.current) {
        setResultado(capturadoRef.current);
        return capturadoRef.current;
      }

      // Modelo respondeu sem chamar nenhuma tool
      const textoResposta = ultimaRespostaTextoRef.current || '(sem texto)';
      throw new Error(`não entendi o comando (modelo respondeu: "${textoResposta.slice(0, 80)}")`);

    } catch (e) {
      const msg = e.message || 'erro ao interpretar';
      console.log('[Interpretador] erro:', msg);
      // Se travou/estourou o timeout, interrompe a geração pra não deixar
      // o modelo "preso" gerando em segundo plano pro próximo comando.
      if (msg.includes('demorou mais de')) {
        try { llm.interrupt(); } catch {}
      }
      setErro(msg);
      return { tipo: 'nao_reconhecido', motivo: msg };
    } finally {
      setEstaProcessando(false);
    }
  }, [llm, executarTool]);

  return [
    { estaProcessando, resultado, erro, modeloPronto: llm.isReady, progressoModelo: llm.downloadProgress },
    gerarComando,
  ];
}