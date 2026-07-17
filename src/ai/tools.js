// -----------------------------------------------------------------------
// Tools do interpretador de comandos de voz (tool calling nativo do
// react-native-executorch, modo "managed": configure() + sendMessage()).
//
// IMPORTANTE sobre o formato: o LLMTool dessa lib usa `type: 'dict'` no
// nível raiz de `parameters` (não `'object'`, como no padrão OpenAI/JSON
// Schema). Ver doc oficial:
// https://docs.swmansion.com/react-native-executorch/docs/hooks/natural-language-processing/useLLM#tool-calling
// -----------------------------------------------------------------------

export const criarTarefaTool = {
  name: 'criar_tarefa',
  description:
    'Cria uma nova tarefa. Use sempre que o usuário quiser adicionar algo pra fazer, não importa como ele fale isso (ex: "tenho que fazer X", "preciso resolver X até sexta", "não posso esquecer de X", "bota aí X pra segunda").',
  parameters: {
    type: 'dict',
    properties: {
      titulo: {
        type: 'string',
        description: 'Título curto e claro da tarefa (obrigatório).',
      },
      materia: {
        type: 'string',
        description:
          'Uma das matérias/categorias cadastradas informadas no system prompt. Se o usuário não mencionar nenhuma, use "Pessoal".',
      },
      data_prazo: {
        type: 'string',
        description:
          'Data de prazo no formato AAAA-MM-DD, se o usuário mencionar (ex: "amanhã", "sexta").',
      },
      hora_prazo: {
        type: 'string',
        description: 'Hora de prazo no formato HH:MM, se o usuário mencionar.',
      },
    },
    required: ['titulo'],
  },
};

export const concluirTarefaTool = {
  name: 'concluir_tarefa',
  description:
    'Marca uma tarefa já existente como concluída. Use sempre que o usuário indicar que já terminou/resolveu algo, não importa como ele fale isso (ex: "terminei X", "já resolvi aquilo", "pode tirar X da lista", "consegui fazer X"). Escolha o tarefa_id certo comparando com a lista de TAREFAS EM ABERTO do system prompt.',
  parameters: {
    type: 'dict',
    properties: {
      tarefa_id: {
        type: 'number',
        description:
          'ID (numérico) da tarefa concluída, copiado exatamente da lista de tarefas em aberto do system prompt.',
      },
      titulo_tarefa: {
        type: 'string',
        description:
          'Título da tarefa como o usuário se referiu a ela, pra conferência caso o ID esteja errado ou ausente.',
      },
    },
    required: ['titulo_tarefa'],
  },
};

export const toolsInterpretador = [criarTarefaTool, concluirTarefaTool];

// -----------------------------------------------------------------------
// Monta o system prompt dinamicamente. Recebe tarefas/matérias já
// carregadas pela tela (não faz query própria no banco) — assim não
// duplicamos a responsabilidade de acesso a dados e sempre refletimos o
// estado mais atual que a tela já tem em memória.
//
// Diferente da versão anterior, o contexto de tarefas em aberto é SEMPRE
// incluído (antes só entrava se o texto batesse num regex de palavras
// de conclusão — o que ia contra o objetivo de entender fala livre).
// -----------------------------------------------------------------------
export function montarPromptSistema(tarefasEmAberto = [], materiasCadastradas = []) {
  const dataHoraAtual = new Date().toLocaleString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const materiasTexto =
    materiasCadastradas.length > 0
      ? materiasCadastradas.map((m) => `- ${m.nome}`).join('\n')
      : '- Trabalho\n- Estudo\n- Pessoal';

  const tarefasTexto =
    tarefasEmAberto.length > 0
      ? tarefasEmAberto.map((t) => `- [ID ${t.id}] ${t.titulo}`).join('\n')
      : 'Nenhuma tarefa em aberto no momento.';

  return `Você é um assistente de produtividade que entende comandos de voz em português falados de forma natural, sem depender de frases fixas.

DATA E HORA ATUAL: ${dataHoraAtual}

MATÉRIAS CADASTRADAS (escolha uma dessas se o usuário mencionar, senão use "Pessoal"):
${materiasTexto}

TAREFAS EM ABERTO (use o ID exato daqui pra concluir_tarefa):
${tarefasTexto}

SEU OBJETIVO:
- Se o usuário quiser CRIAR uma tarefa, chame a tool criar_tarefa.
- Se o usuário indicar que já terminou/concluiu algo, chame a tool concluir_tarefa usando o ID da lista acima.
- NÃO se apegue a palavras-chave específicas — interprete a intenção da frase, mesmo que ela seja informal, incompleta ou diferente dos exemplos abaixo.

EXEMPLOS DE CRIAÇÃO (apenas exemplos, não são as únicas formas possíveis):
"tenho que fazer X", "preciso resolver X até amanhã às 5", "não posso esquecer de X", "bota aí X pra segunda"

EXEMPLOS DE CONCLUSÃO (apenas exemplos, não são as únicas formas possíveis):
"terminei X", "já resolvi aquilo", "pode tirar X da lista", "consegui fazer X", "X tá feito"

IMPORTANTE:
- Se o usuário disser "amanhã", "sexta", etc, calcule a data real baseada em ${dataHoraAtual} e preencha data_prazo em AAAA-MM-DD.
- Sempre chame uma tool quando entender um comando de criar ou concluir — não responda só com texto.
- Se não tiver certeza de qual tarefa concluir, escolha a mais parecida pelo título e preencha titulo_tarefa pra conferência.`;
}