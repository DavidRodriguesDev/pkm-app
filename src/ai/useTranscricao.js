import { useCallback, useEffect } from 'react';
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
// download maior e transcrição um pouco mais lenta.
export function useTranscricao() {
  const model = useSpeechToText({ model: models.speech_to_text.whisper_base() });

  // Log do progresso de download/carregamento do modelo — útil pra
  // diferenciar "ainda baixando o modelo" de "travou transcrevendo".
  useEffect(() => {
    const pct = Math.round((model.downloadProgress || 0) * 100);
    console.log(`[Transcricao] modelo (Whisper base): ${pct}% | pronto: ${model.isReady}`);
  }, [model.downloadProgress, model.isReady]);

  const transcrever = useCallback(
    async (uriDoAudio) => {
      if (!uriDoAudio) return '';

      if (!model.isReady) {
        const pct = model.downloadProgress != null ? Math.round(model.downloadProgress * 100) : 0;
        throw new Error(`modelo de transcrição ainda carregando (${pct}%) — espera terminar e tenta de novo`);
      }

      const audioContext = new AudioContext({ sampleRate: 16000 });
      const buffer = await audioContext.decodeAudioData(uriDoAudio);
      const waveform = buffer.getChannelData(0);

      console.log('[Transcricao] transcrevendo áudio...');
      const resultado = await model.transcribe(waveform, { language: 'pt' });
      const texto = typeof resultado === 'string' ? resultado : resultado?.text ?? '';
      console.log('[Transcricao] resultado:', texto);
      return texto;
    },
    [model]
  );

  const transcreverESalvar = useCallback(
    async (uriDoAudio, { categoria, idPai }) => {
      const texto = await transcrever(uriDoAudio);

      if (!texto.trim()) return null;

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