import { db } from './db';

// Tabela de matérias
export const materias = {
  name: 'materias',
  create: `
    CREATE TABLE IF NOT EXISTS materias (
      id INTEGER PRIMARY KEY,
      nome TEXT UNIQUE NOT NULL,
      criada_em TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  `,
};

// Tabela de tarefas
export const tarefas = {
  name: 'tarefas',
  create: `
    CREATE TABLE IF NOT EXISTS tarefas (
      id INTEGER PRIMARY KEY,
      titulo TEXT NOT NULL,
      concluida INTEGER DEFAULT 0 NOT NULL,
      materia TEXT DEFAULT 'Pessoal',
      data_prazo TEXT,
      hora_prazo TEXT,
      criada_em TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
      origem TEXT DEFAULT 'manual'
    );
  `,
};

// Tabela de notas
export const notas = {
  name: 'notas',
  create: `
    CREATE TABLE IF NOT EXISTS notas (
      id INTEGER PRIMARY KEY,
      titulo TEXT NOT NULL,
      conteudo TEXT NOT NULL,
      audio_uri TEXT,
      duracao_audio INTEGER DEFAULT 0,
      criada_em TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  `,
};

// execAsync roda SQL "puro" (sem parâmetros/placeholders) — ideal pra DDL.
// Rodar tudo junto numa única chamada evita múltiplas idas ao banco.
export async function criarTabelas() {
  await db.execAsync(`
    ${materias.create}
    ${tarefas.create}
    ${notas.create}
  `);
}