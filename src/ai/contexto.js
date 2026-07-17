import { db } from '../database/db';

// Monta o system prompt dinamicamente
export async function montarPromptSistema() {
  const agora = new Date();
  const dataHoraAtual = agora.toLocaleString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Obter matérias cadastradas (API nova do expo-sqlite)
  const listaMaterias = await db.getAllAsync('SELECT * FROM materias ORDER BY nome');
  const materiasTexto = listaMaterias.map((m) => `- ${m.nome}`).join('\n');

  // Obter tarefas em aberto (para referência ao concluir)
  const tarefasEmAberto = await db.getAllAsync(
    'SELECT * FROM tarefas WHERE concluida = 0 ORDER BY criada_em DESC LIMIT 10'
  );

  const tarefasTexto = tarefasEmAberto.length > 0
    ? tarefasEmAberto.map((t) => `- [ID ${t.id}] ${t.titulo}`).join('\n')
    : 'Nenhuma tarefa em aberto no momento.';

  return `Você é um assistente de produtividade que entende comandos de voz em português.

DATA E HORA ATUAL: ${dataHoraAtual}

MATÉRIAS CADASTRADAS (escolha uma dessas se o usuário mencionar):
${materiasTexto}

TAREFAS EM ABERTO (para referência ao concluir):
${tarefasTexto}

SEU OBJETIVO:
1. Se o usuário quiser CRIAR uma tarefa, extraia: título, matéria (se mencionada) e data/hora (se mencionada)
2. Se o usuário quiser CONCLUIR uma tarefa, identifique qual tarefa em aberto ele está se referindo

COMANDOS DE CRIAÇÃO (sintaxes comuns):
- "tenho que fazer X"
- "preciso fazer X até amanhã às 5"
- "tive que fazer X hoje"
- "não posso esquecer de X"
- "vou ter que fazer X"

COMANDOS DE CONCLUSÃO (sintaxes comuns):
- "realizei X"
- "terminei X"
- "concluí X"
- "finalizei X"
- "fiz X"

FORMATO DE RESPOSTA (sempre use tool calling):
- Para criar: { "tool": "criar_tarefa", "args": { "titulo": "...", "materia": "...", "data_prazo": "AAAA-MM-DD" } }
- Para concluir: { "tool": "concluir_tarefa", "args": { "tarefa_id": X } }

IMPORTANTE:
- Se não houver dúvida sobre qual tarefa concluir, use a tool de concluir
- Se o usuário pedir para criar e não especificar matéria, use "Pessoal" como padrão
- A data_prazo deve estar no formato AAAA-MM-DD (ex: 2026-07-20)
- Se o usuário disser "amanhã", calcule a data correta baseada em ${dataHoraAtual}`;
}
