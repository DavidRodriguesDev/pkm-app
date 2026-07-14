# PKM App - App de Produtividade e Estudos

> Um aplicativo mobile monocromático (estilo terminal) para organização de tarefas, notas de aula, resumos e gravações, focado em minimalismo e eficiência.

---

## O que é este projeto

Este é um aplicativo React Native/Expo construído com estética de terminal (btop/htop), com:
- Design **preto e branco** estrito (sem cores)
- Fonte **monoespaçada** do sistema
- Interação por **comandos de voz** (simulado)
- Suporte a **Markdown + LaTeX + Mermaid** para renderização de conteúdo técnico

---

## Objetivos do projeto

| Prioridade | Objetivo |
|------------|----------|
| 1 | Criar um app de produtividade minimalista para estudantes |
| 2 | Notas de aula com gravação e transcrição simulada |
| 3 | Sistema de tarefas com comandos de voz (ex: "realizei X", "tenho que fazer Y") |
| 4 | Resumos com renderização de fórmulas matemáticas |
| 5 | Chat de aula para troca de mensagens e arquivos |
| 6 | Estética de terminal para foco e minimalismo |

---

## O que já foi implementado

### Tela de Tarefas (`src/screens/TarefasScreen.js`)
- Lista de tarefas com conclusão
- Adição manual de tarefas
- **Comandos de voz simulados** - ex: "tenho que fazer X até amanhã às 5"
- Interpretador de voz (`src/utils/comandosDeVoz.js`) que reconhece:
  - Criar tarefas com título, prazo e matéria
  - Concluir tarefas existentes
  - Detecção automática de matéria (Trabalho, Estudo, Pessoal)

### Tela de Notas (`src/screens/NotasScreen.js`)
- Lista de notas mentais
- Gravação de áudio simulada
- Transcrição em tempo real (mock)
- Abre no Visualizador para leitura

### Tela de Aulas (`src/screens/AulasScreen.js`)
- Lista de aulas por matéria
- Chat da aula (`src/screens/ChatAulaScreen.js`)
- Criação de novas aulas
- Filtragem por matéria

### Tela de Resumos (`src/screens/ResumosScreen.js`)
- Lista de resumos com preview
- Abre no Visualizador para leitura completa
- Exemplo com Markdown + LaTeX + Mermaid

### Visualizador (`src/screens/VisualizadorScreen.js`)
- Renderização de **Markdown**
- Renderização de **LaTeX** ($ inline e $$ bloco)
- Renderização de **Mermaid** diagrams
- Toggle VER/EDITAR
- Reprodução de áudio (para notas)

### Gravação (`src/screens/GravacaoScreen.js`)
- Gravação de áudio simulada
- Contador de duração
- Transcrição pré-formatada

### Chat da Aula (`src/screens/ChatAulaScreen.js`)
- Troca de mensagens
- Botão para gravar (simulado)
- Botões para anexos (placeholder com alertas)
- Área de mensagens com scroll automático

---

## Tecnologias usadas

| Biblioteca | Uso |
|------------|-----|
| React Native 0.86 | UI base |
| Expo 57 | Framework |
| React Navigation | Navegação (Bottom Tabs + Stack) |
| `react-native-markdown-display` | Renderização Markdown |
| `react-native-katex` | Renderização LaTeX |
| `react-native-webview` | WebView para renderização conjunta |
| `expo-audio` | Gravação de áudio |

---

## Estrutura do projeto

```
pkm-app/
├── App.js                 # Navegação principal (Tabs)
├── index.js               # Ponto de entrada
├── app.json               # Configuração Expo
├── package.json           # Dependências
├── src/
│   ├── theme.js           # Tema monocromático (cores, spacing, font)
│   ├── assets/            # Assets do projeto
│   ├── components/        # Componentes reutilizáveis
│   │   └── Card.js        # Card + StatusBadge
│   ├── screens/           # Telas do app
│   │   ├── AulasScreen.js
│   │   ├── ChatAulaScreen.js
│   │   ├── GravacaoScreen.js
│   │   ├── NotasScreen.js
│   │   ├── ResumosScreen.js
│   │   ├── TarefasScreen.js
│   │   ├── VisualizadorScreen.js
│   │   └── utils/
│   │       └── comandosDeVoz.js
│   └── assets/            # Outros assets
└── assets/                # Ícones, splash, libs (katex, mermaid)
```

---

## Como usar

### Instalação
```bash
npm install
npx expo start
```

### Comandos de voz simulados

Para testar, toque no ícone de microfone e o app usará uma frase pré-definida:

- **Criar tarefa**: "tenho que fazer uma atividade de matemática até amanhã às 5 horas da tarde"
- **Concluir tarefa**: "realizei pagar conta de luz"

---

## Próximos passos (para novos contribuidores)

### Prioridade alta
1. **Conectar com backend real** - substituir mocks por API
2. **Implementar gravação de áudio real** - usar `expo-audio` para gravar e salvar
3. **Implementar transcrição real** - conectar Whisper ou Google Speech-to-Text
4. **Adicionar autenticação** - atualmente tudo é local

### Prioridade média
5. **Melhorar o interpretador de voz** - mais variações de frases
6. **Adicionar busca/filtros** - nas tarefas e notas
7. **Exportação de dados** - CSV/PDF dos resumos

### Prioridade baixa
8. **Notificações push** - lembretes de prazos
9. **Backup automático** - para nuvem
10. **Tema claro** - alternância tema preto/branco

---

## Notas para desenvolvedores

- **Estética rigorosa**: nunca adicione cores, use apenas variações de cinza
- **Fonte monoespaçada**: mantenha a consistência do terminal
- **Comentários no código**: explicitem mocks e o que precisa mudar em produção
- **Testes manuais**: o app usa simulações - valide cada feature manualmente
