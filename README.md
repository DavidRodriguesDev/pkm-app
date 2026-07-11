# PKM App — front-end (esqueleto)

Front-end mobile do app de gestão de conhecimento pessoal, feito em React Native + Expo.
Nesta etapa é só a interface, com dados mockados — sem SQLite, sem gravação real, sem
conexão com o PC ainda. O objetivo é validar o fluxo e o visual antes de plugar a lógica.

## Como rodar

1. Crie o projeto base do Expo (se ainda não tiver um):
   ```
   npx create-expo-app pkm-app
   cd pkm-app
   ```

2. Instale as dependências de navegação:
   ```
   npx expo install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/native-stack react-native-screens react-native-safe-area-context
   ```

3. Copie a pasta `src/` e o arquivo `App.js` deste projeto pra dentro do seu projeto Expo,
   substituindo o `App.js` que o `create-expo-app` gerou.

4. Rode:
   ```
   npx expo start
   ```

5. Escaneie o QR code com o app **Expo Go** (Play Store) no seu celular.

## Estrutura

```
App.js                        -> navegação (bottom tabs + stacks)
src/theme.js                  -> cores e espaçamentos centrais
src/components/Card.js        -> card e badge de status reutilizáveis
src/screens/NotasScreen.js    -> lista de sessões de notas (só captura por voz)
src/screens/AulasScreen.js    -> lista de aulas, filtro por matéria, modal de nova aula
src/screens/TarefasScreen.js  -> lista de tarefas, input por texto ou voz, confirmação do agente
src/screens/ResumosScreen.js  -> lista de resumos gerados, expansível ao tocar
src/screens/GravacaoScreen.js -> tela de gravação (usada por Notas e Aulas, com anexos só em Aulas)
```

## Decisões desta versão

- **Espaçamento superior:** todas as telas usam `useSafeAreaInsets` + um respiro extra, pensando
  na barra de notificação/câmera do Poco X7 Pro. Se noutro aparelho ficar apertado ou exagerado,
  ajuste o valor de `spacing.lg` somado ao `insets.top` em cada tela.
- **Notas só grava:** removido anexo de foto/documento do fluxo de Notas — fica só no de Aulas,
  onde faz sentido (foto de quadro, apostila, etc).
- **Nova aula tem formulário próprio:** o botão "+" em Aulas abre um modal pra nomear a aula e
  escolher (ou criar) a matéria antes de ir pra tela de gravação — reflete o fluxo real de
  "criar bloco associado a uma matéria" descrito na arquitetura.
- **Tarefas aceita texto ou voz:** o campo de texto pode ser digitado direto ou preenchido a
  partir da gravação (hoje simulada) — os dois caminhos alimentam o mesmo botão de adicionar.
- **Resumos agora tem aba própria:** lista os resumos já gerados, com matéria e período, expansível.

## O que ainda é mock (próximos passos)

- `GravacaoScreen`: gravação de áudio e transcrição real (whisper.cpp) — hoje é texto estático.
- `TarefasScreen`: extração de intenção via IA — hoje o botão de mic só simula preencher o texto.
- `AulasScreen` / `NotasScreen` / `ResumosScreen`: dados vêm de arrays fixos no topo do arquivo —
  trocar por consultas ao SQLite local quando o banco for integrado.
- Nenhuma tela ainda fala com o servidor Flask do PC.

Cada ponto onde a lógica real vai entrar está marcado com um comentário no código.
