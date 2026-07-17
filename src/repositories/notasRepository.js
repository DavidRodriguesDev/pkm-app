import { db } from '../database/db';

// Repositório de Notas
export const notasRepository = {
  // Listar todas as notas
  async list() {
    return db.getAllAsync(`SELECT * FROM notas ORDER BY criada_em DESC`);
  },

  // Buscar nota por ID
  async findById(id) {
    const row = await db.getFirstAsync(`SELECT * FROM notas WHERE id = ?`, [id]);
    return row || undefined;
  },

  // Criar nova nota
  async create(titulo, conteudo, audioUri = null, duracaoAudio = 0) {
    const result = await db.runAsync(
      `INSERT INTO notas (titulo, conteudo, audio_uri, duracao_audio) VALUES (?, ?, ?, ?)`,
      [titulo, conteudo, audioUri, duracaoAudio]
    );
    return {
      id: result.lastInsertRowId,
      titulo,
      conteudo,
      audioUri,
      duracaoAudio,
      criadaEm: new Date().toISOString().split('T')[0],
    };
  },

  // Atualizar nota
  async update(id, dados) {
    const setParts = Object.keys(dados).map((k) => `${k} = ?`).join(', ');
    const values = [...Object.values(dados), id];
    await db.runAsync(`UPDATE notas SET ${setParts} WHERE id = ?`, values);
    return this.findById(id);
  },

  // Excluir nota
  async delete(id) {
    await db.runAsync(`DELETE FROM notas WHERE id = ?`, [id]);
  },
};