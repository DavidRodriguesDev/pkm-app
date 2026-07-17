import { useCallback } from 'react';
import { useSpeechToText, models } from 'react-native-executorch';
import { AudioContext } from 'react-native-audio-api';
import * as FileSystem from 'expo-file-system';
import { audioPaths, salvarAudioOrganizado } from '../audio/path';
// Hook GENÉRICO de transcrição on-device (Whisper, 100% offline via
// react-native-executorch). Recebe a URI de um áudio já gravado (por
// exemplo, pelo useGravador) e devolve o texto transcrito. Não sabe nada
// sobre Notas/Tarefas/Aulas — é só "URI de áudio entra, texto sai" — pra
// poder reaproveitar isso quando implementarmos o resumo de aulas.
//
// Usa o Whisper MULTILÍNGUE (não o *_en) com idioma alvo 'pt' — assim ele
// entende o português como idioma principal mas ainda transcreve bem
// termos técnicos em inglês que aparecerem no meio da fala (ex: "React",
// "commit", "merge"), que é o comportamento natural do Whisper com
// code-switching.
//
// whisper_base() em vez de whisper_tiny(): mais preciso, ao custo de
// download maior e transcrição um pouco mais lenta. Ainda assim, um
// modelo local minúsculo nunca vai empatar com o STT do Google (que roda
// em servidor com modelos MUITO maiores) — isso é um limite físico de
// rodar 100% offline no celular, não bug. Se quiser ainda mais precisão
// (com mais RAM/espaço), dá pra tentar whisper_small().
//
// ATENÇÃO — checar ao instalar:
// A API do react-native-executorch mudou bastante entre versões
// (0.4.x até 0.8.x/0.9.x). Os nomes abaixo (isReady, downloadProgress,
// isGenerating, model.transcribe) são os da doc mais recente que
// encontrei, mas o pacote muda rápido — depois de instalar, dá um
// Ctrl+clique em `useSpeechToText` (ou olha o .d.ts em
// node_modules/react-native-executorch) pra confirmar os nomes exatos
// dos campos retornados e ajustar aqui se precisar.
export function useTranscricao() {
  const model = useSpeechToText({ model: models.speech_to_text.whisper_base() });

  const transcrever = useCallback(
    async (uriDoAudio) => {
      if (!uriDoAudio) return '';

      // Se o modelo ainda não terminou de baixar/carregar, model.transcribe
      // pode nem existir ainda — sem essa checagem o erro que aparece é um
      // "undefined is not a function" genérico, sem dizer o motivo real.
      if (!model.isReady) {
        const pct = model.downloadProgress != null ? Math.round(model.downloadProgress * 100) : 0;
        throw new Error(`modelo de transcrição ainda carregando (${pct}%) — espera terminar e tenta de novo`);
      }

      // Precisa do waveform em 16kHz mono — react-native-audio-api faz
      // a decodificação do arquivo gravado (m4a/wav) pra isso.
      const audioContext = new AudioContext({ sampleRate: 16000 });
      const buffer = await audioContext.decodeAudioData(uriDoAudio);
      const waveform = buffer.getChannelData(0);

      // language é obrigatório pra modelo multilíngue — 'pt' faz o
      // Whisper priorizar português, mas sem travar em termos técnicos
      // em inglês que aparecerem misturados na fala.
      const resultado = await model.transcribe(waveform, { language: 'pt' });
      return typeof resultado === 'string' ? resultado : resultado?.text ?? '';
    },
    [model]
  );

  // Transcreve áudio E salva o resultado em uma pasta organizada
  // Útil quando já temos o ID da entidade (ex: nota gravada durante criação)
  const transcreverESalvar = useCallback(
    async (uriDoAudio, { categoria, idPai }) => {
      const texto = await transcrever(uriDoAudio);

      if (!texto.trim()) return null;

      // Salvar transcrição em arquivo .txt na mesma pasta do áudio
      if (categoria && idPai) {
        try {
          const dirBase = categoria === 'notas' ? audioPaths.notas.getNotaDir(idPai) :
                          categoria === 'tarefas' ? audioPaths.tarefas.getTarefaDir(idPai) :
                          categoria === 'aulas' ? audioPaths.aulas.getAulaDir(idPai) :
                          null;

          if (dirBase) {
            await FileSystem.makeDirectoryAsync(dirBase, { intermediates: true });
            const timestamp = Date.now();
            await FileSystem.writeAsStringAsync(`${dirBase}transcricao_${timestamp}.txt`, texto);
          }
        } catch (e) {
          console.warn('[useTranscricao] Erro ao salvar transcricao:', e);
          // Não falha se não conseguir salvar — a transcrição já foi retornada
        }
      }

      return texto;
    },
    [transcrever]
  );

  return {
    modeloPronto: model.isReady,
    progressoModelo: model.downloadProgress,
    transcrevendo: model.isGenerating,
    erro: model.error,
    transcrever,
    transcreverESalvar,
  };
}
