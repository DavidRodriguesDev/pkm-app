import { db } from '../database/db';
import { criarTabelas } from '../database/schema';

// Tipos para JavaScript
// Tarefa: { id, titulo, concluida, materia, dataPrazo, horaPrazo, criadaEm, origem }
// Materia: { id, nome, criadaEm }

// Repositório de Tarefas
export const tarefasRepository = {
  // Listar tarefas.
  // Sem argumento -> traz TODAS (pendentes + concluídas), quem filtra é a tela.
  // Passando true/false -> traz só concluídas ou só pendentes (uso opcional, caso precise em algum lugar específico).
  async list(filtro) {
    let query = `SELECT * FROM tarefas ORDER BY criada_em DESC`;
    let params = [];
    if (typeof filtro === 'boolean') {
      query = `SELECT * FROM tarefas WHERE concluida = ? ORDER BY criada_em DESC`;
      params = [filtro ? 1 : 0];
    }
    const rows = await db.getAllAsync(query, params);
    return rows.map((t) => ({ ...t, concluida: t.concluida === 1 }));
  },
  // Buscar tarefa por ID
  async findById(id) {
    const row = await db.getFirstAsync(`SELECT * FROM tarefas WHERE id = ?`, [id]);
    if (!row) return undefined;
    return { ...row, concluida: row.concluida === 1 };
  },
  // Criar nova tarefa
  async create(titulo, materia, dataPrazo, horaPrazo, origem = 'manual') {
    const result = await db.runAsync(
      `INSERT INTO tarefas (titulo, materia, data_prazo, hora_prazo, origem) VALUES (?, ?, ?, ?, ?)`,
      [titulo, materia, dataPrazo, horaPrazo, origem]
    );
    return {
      id: result.lastInsertRowId,
      titulo,
      materia,
      dataPrazo,
      horaPrazo,
      origem,
      concluida: false,
      criadaEm: new Date().toISOString().split('T')[0],
    };
  },
  // Atualizar tarefa
  async update(id, dados) {
    const setParts = Object.keys(dados).map((k) => `${k} = ?`).join(', ');
    const values = [...Object.values(dados), id];
    await db.runAsync(`UPDATE tarefas SET ${setParts} WHERE id = ?`, values);
    return this.findById(id);
  },
  // Concluir tarefa
  async concluir(id) {
    await db.runAsync(`UPDATE tarefas SET concluida = 1 WHERE id = ?`, [id]);
  },
  // Desconcluir tarefa
  async desconcluir(id) {
    await db.runAsync(`UPDATE tarefas SET concluida = 0 WHERE id = ?`, [id]);
  },
  // Excluir tarefa
  async excluir(id) {
    await db.runAsync(`DELETE FROM tarefas WHERE id = ?`, [id]);
  },
  // Mantido caso algo antigo ainda chame .delete()
  async delete(id) {
    await this.excluir(id);
  },
  // Buscar tarefas por título (fuzzy simples)
  async buscarPorTitulo(palavraChave) {
    const palavraLower = `%${palavraChave.toLowerCase()}%`;
    const rows = await db.getAllAsync(
      `SELECT * FROM tarefas WHERE LOWER(titulo) LIKE LOWER(?) ORDER BY criada_em DESC`,
      [palavraLower]
    );
    return rows.map((t) => ({ ...t, concluida: t.concluida === 1 }));
  },
};

// Repositório de Matérias
export const materiasRepository = {
  // Listar todas as matérias
  async list() {
    return db.getAllAsync(`SELECT * FROM materias ORDER BY nome`);
  },
  // Buscar por nome
  async findByNome(nome) {
    const row = await db.getFirstAsync(`SELECT * FROM materias WHERE nome = ?`, [nome]);
    return row || undefined;
  },
  // Criar nova matéria
  async create(nome) {
    const result = await db.runAsync(`INSERT INTO materias (nome) VALUES (?)`, [nome]);
    return {
      id: result.lastInsertRowId,
      nome,
      criadaEm: new Date().toISOString().split('T')[0],
    };
  },
  // Verificar se matéria existe
  async exists(nome) {
    const existe = await materiasRepository.findByNome(nome);
    return !!existe;
  },
};

// Inicialização do banco de dados
export async function initDatabase() {
  await criarTabelas();
  // Cria matérias padrão se não existirem
  const materiasPadrao = ['Trabalho', 'Estudo', 'Pessoal'];
  for (const m of materiasPadrao) {
    if (!(await materiasRepository.findByNome(m))) {
      await materiasRepository.create(m);
    }
  }
}