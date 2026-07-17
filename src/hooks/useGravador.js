import { useCallback, useEffect, useRef, useState } from 'react';
import {
  useAudioRecorder,
  useAudioRecorderState,
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
} from 'expo-audio';

// Hook GENÉRICO de gravação de áudio real. Não sabe nada sobre
// transcrição — só grava e devolve a URI do arquivo gravado no fim.
// Pensado pra ser reaproveitado em Notas, Tarefas (comando de voz) e,
// depois, na gravação/chat de aulas — quem usa só precisa saber
// iniciar()/parar(), sem se importar com a origem do áudio.
export function useGravador() {
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);
  const [permissaoOk, setPermissaoOk] = useState(false);
  const [tempoGravacao, setTempoGravacao] = useState(0);
  const intervaloRef = useRef(null);

  useEffect(() => {
    (async () => {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      setPermissaoOk(status.granted);
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
    })();
    return () => clearInterval(intervaloRef.current);
  }, []);

  const iniciar = useCallback(async () => {
    if (!permissaoOk) {
      console.warn('[useGravador] permissão de microfone negada');
      return false;
    }
    await audioRecorder.prepareToRecordAsync();
    audioRecorder.record();
    setTempoGravacao(0);
    intervaloRef.current = setInterval(() => setTempoGravacao((t) => t + 1), 1000);
    return true;
  }, [audioRecorder, permissaoOk]);

  // Retorna a URI do arquivo gravado (ou null se não estava gravando)
  const parar = useCallback(async () => {
    clearInterval(intervaloRef.current);
    if (!recorderState.isRecording) return null;
    await audioRecorder.stop();
    return audioRecorder.uri;
  }, [audioRecorder, recorderState.isRecording]);

  return {
    permissaoOk,
    gravando: recorderState.isRecording,
    tempoGravacao,
    iniciar,
    parar,
  };
}
