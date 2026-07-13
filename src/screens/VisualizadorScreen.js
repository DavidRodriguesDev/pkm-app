import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, spacing, radius, font } from '../theme';
import { useAudioPlayer } from 'expo-audio';

// ---------------------------------------------------------------------------
// Renderiza markdown + LaTeX ($ inline e $$ bloco) + mermaid, tudo numa única
// WebView, usando bibliotecas via CDN. O LaTeX é extraído ANTES do parser de
// markdown pra "_"/"*" do LaTeX não virarem itálico/negrito por engano.
// ---------------------------------------------------------------------------

function buildHtml(conteudo) {
  const conteudoSerializado = JSON.stringify(conteudo || '');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/marked@9.1.6/marked.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <style>
    * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    html, body { margin: 0; padding: 0; background: transparent; }
    body {
      font-family: 'Courier New', Menlo, Consolas, monospace;
      font-size: 14px;
      line-height: 1.6;
      color: ${colors.textPrimary};
      padding: 2px 2px 24px 2px;
    }
    h1 { font-size: 20px; font-weight: 700; margin: 20px 0 10px; letter-spacing: 0.5px; text-transform: uppercase; border-bottom: 1px solid ${colors.border}; padding-bottom: 8px; }
    h2 { font-size: 16px; font-weight: 700; margin: 18px 0 8px; }
    h2::before { content: "# "; color: ${colors.textDim}; }
    h3 { font-size: 14px; font-weight: 700; margin: 14px 0 6px; }
    p { margin: 0 0 10px; }
    ul, ol { padding-left: 20px; margin: 0 0 10px; }
    li { margin-bottom: 4px; }
    li::marker { color: ${colors.textDim}; }
    hr { border: none; border-top: 1px dashed ${colors.border}; margin: 18px 0; }
    a { color: ${colors.textPrimary}; text-decoration: underline; }
    strong { color: ${colors.accent}; }
    code {
      background: ${colors.surface};
      border: 1px solid ${colors.border};
      padding: 1px 5px;
      border-radius: 2px;
      font-size: 12.5px;
      font-family: 'Courier New', Menlo, Consolas, monospace;
    }
    pre code {
      display: block;
      padding: 10px;
      overflow-x: auto;
      white-space: pre;
      border-radius: 3px;
    }
    .katex-display { overflow-x: auto; overflow-y: hidden; padding: 8px 0; margin: 10px 0; }
    .katex { color: ${colors.textPrimary}; }
    .mermaid { text-align: center; margin: 16px 0; filter: grayscale(1) contrast(1.1); }
    .erro-render { color: ${colors.textDim}; font-size: 12px; font-style: italic; }
  </style>
</head>
<body>
  <div id="conteudo"></div>

  <script>
    const textoOriginal = ${conteudoSerializado};

    function postHeight() {
      const h = document.body.scrollHeight;
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(String(h + 16));
      }
    }

    function processarConteudo(texto) {
      const blocosMath = [];

      let semMath = texto
        .replace(/\\$\\$([\\s\\S]+?)\\$\\$/g, function (_m, expr) {
          const idx = blocosMath.length;
          blocosMath.push({ expr: expr.trim(), display: true });
          return '@@MATH' + idx + '@@';
        })
        .replace(/\\$([^\\$\\n]+?)\\$/g, function (_m, expr) {
          const idx = blocosMath.length;
          blocosMath.push({ expr: expr.trim(), display: false });
          return '@@MATH' + idx + '@@';
        });

      let html = marked.parse(semMath);

      html = html.replace(/@@MATH(\\d+)@@/g, function (_m, idx) {
        const bloco = blocosMath[Number(idx)];
        if (!bloco) return '';
        try {
          return katex.renderToString(bloco.expr, {
            throwOnError: false,
            displayMode: bloco.display,
          });
        } catch (e) {
          return '<span class="erro-render">' + bloco.expr + '</span>';
        }
      });

      return html;
    }

    document.getElementById('conteudo').innerHTML = processarConteudo(textoOriginal);

    document.querySelectorAll('code.language-mermaid').forEach(function (codeEl) {
      const pre = codeEl.closest('pre') || codeEl;
      const div = document.createElement('div');
      div.className = 'mermaid';
      div.textContent = codeEl.textContent;
      pre.replaceWith(div);
    });

    const nosMermaid = document.querySelectorAll('.mermaid');
    if (nosMermaid.length > 0) {
      mermaid.initialize({ startOnLoad: false, theme: 'neutral' });
      mermaid.run({ nodes: Array.from(nosMermaid) }).then(postHeight).catch(postHeight);
    }

    window.addEventListener('load', function () { setTimeout(postHeight, 150); });
    setTimeout(postHeight, 60);
    setTimeout(postHeight, 500);
  </script>
</body>
</html>
`;
}

function ConteudoRenderizado({ texto }) {
  const [altura, setAltura] = useState(80);
  const [carregando, setCarregando] = useState(true);

  const onMessage = (event) => {
    const novaAltura = parseInt(event.nativeEvent.data, 10);
    if (!isNaN(novaAltura) && novaAltura > 0) {
      setAltura(novaAltura);
      setCarregando(false);
    }
  };

  return (
    <View>
      {carregando && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={colors.textPrimary} />
        </View>
      )}
      <WebView
        source={{ html: buildHtml(texto) }}
        style={[styles.webview, { height: altura }]}
        onMessage={onMessage}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        androidLayerType="hardware"
      />
    </View>
  );
}

const RESUMO_EXEMPLO = `# Resumo P1 - Cálculo II

## Limites
A definição formal de limite estabelece que $\\lim_{x \\to a} f(x) = L$ significa que para todo $\\varepsilon > 0$ existe $\\delta > 0$ tal que...

## Derivadas
A derivada surge do limite do quociente incremental:

$$f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}$$

## Conexão entre os temas

\`\`\`mermaid
graph LR
  A[Limite] --> B[Continuidade]
  B --> C[Derivada]
  C --> D[Regras de derivação]
\`\`\`
`;

const NOTA_EXEMPLO = `# Nota da Aula de Hoje

Hoje tivemos uma aula sobre estrutura de dados. O professor explicou sobre arrays e objetos.

## Principais pontos

- Arrays são estruturas lineares
- Objetos permitem associação chave-valor
- Ambos são fundamentais para programação

Lembre-se de estudar para a próxima prova: $$\\sum_{i=1}^{n} i^2 = \\frac{n(n+1)(2n+1)}{6}$$

---
`;

export default function VisualizadorScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { type, dados } = route.params || {};
  const [modo, setModo] = useState('visualizar');
  const [texto, setTexto] = useState('');

  const audioPath = require('../assets/audio/placeholder.mp3');
  const player = useAudioPlayer(audioPath);

  const tocando = player?.state === 'playing';

  const conteudoMockado = type === 'resumo' ? RESUMO_EXEMPLO : NOTA_EXEMPLO;

  useEffect(() => {
    if (dados?.conteudo) {
      setTexto(dados.conteudo);
    } else {
      setTexto(conteudoMockado);
    }
  }, [type, dados, conteudoMockado]);

  useEffect(() => {
    navigation.setOptions({
      title: (type === 'resumo' ? 'RESUMO' : 'NOTA'),
      headerRight: () => (
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleBotao, modo === 'visualizar' && styles.toggleBotaoAtivo]}
            onPress={() => setModo('visualizar')}
          >
            <Text style={[styles.toggleTexto, modo === 'visualizar' && styles.toggleTextoAtivo]}>
              VER
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBotao, modo === 'editar' && styles.toggleBotaoAtivo]}
            onPress={() => setModo('editar')}
          >
            <Text style={[styles.toggleTexto, modo === 'editar' && styles.toggleTextoAtivo]}>
              EDITAR
            </Text>
          </TouchableOpacity>
        </View>
      ),
    });
  }, [modo, navigation, type]);

  const TOCAR_AUDIO = () => {
    if (tocando) {
      player?.pause();
    } else {
      player?.play();
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={{ flex: 1, padding: spacing.md }}>
        {modo === 'visualizar' ? (
          <View style={styles.conteudoVisualizar}>
            <ConteudoRenderizado texto={texto} />

            {type === 'nota' && (
              <View style={styles.botaoAudioContainer}>
                <TouchableOpacity style={styles.botaoAudio} onPress={TOCAR_AUDIO}>
                  <Ionicons name={tocando ? 'pause' : 'play'} size={18} color={colors.textPrimary} />
                  <Text style={styles.textoAudio}>{tocando ? '[ PAUSAR ÁUDIO ]' : '[ OUVIR GRAVAÇÃO ORIGINAL ]'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <TextInput
            style={styles.conteudoEditar}
            value={texto}
            onChangeText={setTexto}
            multiline
            placeholder="digite o conteúdo..."
            placeholderTextColor={colors.textDim}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  conteudoVisualizar: { flex: 1 },
  webview: { width: '100%', backgroundColor: 'transparent' },
  loadingOverlay: { paddingVertical: spacing.xl, alignItems: 'center' },
  conteudoEditar: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    fontSize: 14,
    fontFamily: font.mono,
    color: colors.textPrimary,
    lineHeight: 22,
    minHeight: 400,
  },
  toggleContainer: { flexDirection: 'row', backgroundColor: colors.background, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  toggleBotao: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  toggleBotaoAtivo: { backgroundColor: colors.accent },
  toggleTexto: { fontSize: 11, fontFamily: font.mono, letterSpacing: 0.5, color: colors.textSecondary },
  toggleTextoAtivo: { color: colors.onAccent, fontWeight: '700' },
  botaoAudioContainer: { marginTop: spacing.lg },
  botaoAudio: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border },
  textoAudio: { color: colors.textPrimary, fontSize: 12, fontFamily: font.mono },
});
