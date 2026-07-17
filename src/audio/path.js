import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

// -----------------------------------------------------------------------
// Caminhos de áudio organizados por categoria
// -----------------------------------------------------------------------

// Diretório base de áudios (no FileSystem do Expo)
const AUDIO_BASE_DIR = `${FileSystem.documentDirectory}audios/`;

// Diretórios por categoria
export const audioPaths = {
  // Áudios de Notas (gravados na NotasScreen)
  notas: {
    base: `${AUDIO_BASE_DIR}notas/`,
    getNotaDir: (notaId) => `${AUDIO_BASE_DIR}notas/${notaId}/`,
  },
  // Áudios de Tarefas (opcional - se quiser vincular áudio à tarefa)
  tarefas: {
    base: `${AUDIO_BASE_DIR}tarefas/`,
    getTarefaDir: (tarefaId) => `${AUDIO_BASE_DIR}tarefas/${tarefaId}/`,
  },
  // Áudios de Aulas (para futuro uso na AulasScreen)
  aulas: {
    base: `${AUDIO_BASE_DIR}aulas/`,
    getAulaDir: (aulaId) => `${AUDIO_BASE_DIR}aulas/${aulaId}/`,
  },
};

// -----------------------------------------------------------------------
// Funções utilitárias para manipular diretórios
// -----------------------------------------------------------------------

// Criar diretório se não existir
export async function criarDiretorioSeNaoExistir(caminho) {
  const info = await FileSystem.getInfoAsync(caminho);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(caminho, { intermediates: true });
  }
  return caminho;
}

// Criar todos os diretórios de áudio
export async function inicializarDiretoriosDeAudio() {
  await criarDiretorioSeNaoExistir(audioPaths.notas.base);
  await criarDiretorioSeNaoExistir(audioPaths.tarefas.base);
  await criarDiretorioSeNaoExistir(audioPaths.aulas.base);
}

// Listar arquivos de um diretório
export async function listarArquivosDeDiretorio(caminho) {
  const info = await FileSystem.getInfoAsync(caminho);
  if (!info.exists) return [];
  return await FileSystem.readDirectoryAsync(caminho);
}

// Deletar arquivo
export async function deletarArquivo(caminho) {
  const info = await FileSystem.getInfoAsync(caminho);
  if (info.exists) {
    await FileSystem.deleteAsync(caminho);
  }
}

// Deletar diretório e todo conteúdo
export async function deletarDiretorioRecursivo(caminho) {
  const info = await FileSystem.getInfoAsync(caminho);
  if (info.exists && info.isDirectory) {
    await FileSystem.deleteAsync(caminho, { idempotent: true });
  }
}

// Salvar áudio gravado em diretório organizado
// Retorna o caminho completo onde o áudio foi salvo
export async function salvarAudioOrganizado({ uri, categoria, idPai }) {
  await inicializarDiretoriosDeAudio();

  const dirBase = categoria === 'notas' ? audioPaths.notas.getNotaDir(idPai) :
                  categoria === 'tarefas' ? audioPaths.tarefas.getTarefaDir(idPai) :
                  categoria === 'aulas' ? audioPaths.aulas.getAulaDir(idPai) :
                  null;

  if (!dirBase) throw new Error(`Categoria inválida: ${categoria}`);

  await criarDiretorioSeNaoExistir(dirBase);

  // Extrair extensão do URI original
  const extensao = uri.split('.').pop();
  const timestamp = Date.now();
  const nomeArquivo = `gravação_${timestamp}.${extensao}`;

  const destino = `${dirBase}${nomeArquivo}`;

  // Mover arquivo para diretório organizado
  await FileSystem.moveAsync({ from: uri, to: destino });

  return destino;
}
