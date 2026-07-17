import { createContext, useContext } from 'react';
import { useTranscricao } from './useTranscricao';
import { useInterpretadorLLM } from './useInterpretadorLLM';

// -----------------------------------------------------------------------
// Garante UMA ÚNICA instância de cada modelo de IA (Whisper e Qwen3) pra
// o app inteiro.
//
// Por quê: o react-native-executorch só suporta um "model runner" ativo
// por vez (doc oficial: "only one active component leveraging useLLM
// concurrently"). Se cada tela chamar useTranscricao()/
// useInterpretadorLLM() por conta própria, telas que continuam montadas
// em segundo plano (comportamento padrão de tab navigator ao trocar de
// aba) criam instâncias concorrentes do mesmo modelo — e aí cai o erro
// "The model is currently generating. Please wait until previous model
// run is complete."
//
// Com o Provider, só existe uma instância de cada hook (montada uma vez
// lá no topo do app) e todas as telas compartilham a mesma via contexto.
//
// Doc: https://docs.swmansion.com/react-native-executorch/docs/hooks/natural-language-processing/useLLM
// -----------------------------------------------------------------------

const AiContext = createContext(null);

export function AiProvider({ children }) {
  const transcricao = useTranscricao();
  const [interpretadorState, interpretarComando] = useInterpretadorLLM();

  const value = {
    transcricao,
    interpretador: interpretadorState,
    interpretarComando,
  };

  return <AiContext.Provider value={value}>{children}</AiContext.Provider>;
}

export function useAi() {
  const ctx = useContext(AiContext);
  if (!ctx) {
    throw new Error('useAi precisa ser usado dentro de um <AiProvider>');
  }
  return ctx;
}
