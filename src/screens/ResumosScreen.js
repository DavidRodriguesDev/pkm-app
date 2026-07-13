import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Card, StatusBadge } from '../components/Card';
import { colors, spacing, font } from '../theme';

// Exemplo completo pra testar o motor de markdown + LaTeX + mermaid do
// Visualizador de verdade: tem cabeçalhos, negrito, LaTeX inline e em
// bloco, uma tabela (GFM), e um diagrama mermaid — tudo junto, do jeito
// que um resumo gerado por IA de Cálculo provavelmente viria.
const CONTEUDO_COMPLETO_CALCULO = `# Resumo P1 - Cálculo II

## Limites e Continuidade

A definição formal de limite estabelece que $\\lim_{x \\to a} f(x) = L$ significa que para todo $\\varepsilon > 0$ existe $\\delta > 0$ tal que se $0 < |x - a| < \\delta$, então $|f(x) - L| < \\varepsilon$.

Uma função é **contínua** em $a$ quando:

$$\\lim_{x \\to a} f(x) = f(a)$$

## Derivadas

A derivada surge do limite do quociente incremental:

$$f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}$$

### Regras principais

| Regra | Fórmula |
| --- | --- |
| Potência | $\\frac{d}{dx}x^n = nx^{n-1}$ |
| Produto | $(fg)' = f'g + fg'$ |
| Cadeia | $(f(g(x)))' = f'(g(x)) \\cdot g'(x)$ |

Exemplo: se $f(x) = x^3 + 2x^2 - 5x + 1$, então:

$$f'(x) = 3x^2 + 4x - 5$$

## Integrais

A integral definida representa a área sob a curva:

$$\\int_a^b f(x)\\,dx = F(b) - F(a)$$

Onde $F$ é uma primitiva de $f$, ou seja, $F'(x) = f(x)$.

### Teorema Fundamental do Cálculo

$$\\frac{d}{dx}\\int_a^x f(t)\\,dt = f(x)$$

## Como os temas se conectam

\`\`\`mermaid
graph LR
  A[Limite] --> B[Continuidade]
  B --> C[Derivada]
  C --> D[Regras de derivação]
  C --> E[Integral]
  E --> F[Teorema Fundamental do Cálculo]
\`\`\`

## Pontos de atenção pra prova

- Não esquecer o $+C$ nas integrais indefinidas
- Revisar regra da cadeia com funções compostas
- $\\lim_{x \\to \\infty} \\dfrac{1}{x} = 0$, mas $\\lim_{x \\to 0} \\dfrac{1}{x}$ não existe

---
`;

// Mock — depois isso vem da tabela Resumos, populada pelo endpoint /resumir.
// `texto` é só a prévia curta mostrada no card; `conteudoCompleto` é o que
// abre no Visualizador (markdown + LaTeX de verdade).
const RESUMOS_MOCK = [
  {
    id: '1',
    nome: 'Resumo P1 - Cálculo II',
    materia: 'Cálculo II',
    periodo: '03/03 a 15/04',
    texto:
      'O conteúdo cobre limites, continuidade e as regras básicas de derivação. ' +
      'As aulas conectam o conceito de limite com a definição formal de derivada, ' +
      'mostrando como a taxa de variação instantânea surge do limite do quociente ' +
      'incremental. Vale revisar a regra da cadeia antes da prova.',
    conteudoCompleto: CONTEUDO_COMPLETO_CALCULO,
  },
  {
    id: '2',
    nome: 'Resumo - Cinemática',
    materia: 'Física I',
    periodo: '01/03 a 10/03',
    texto:
      'Introdução a movimento retilíneo uniforme e uniformemente variado, com ' +
      'ênfase nas equações de Torricelli e na interpretação gráfica de posição, ' +
      'velocidade e aceleração ao longo do tempo.',
    conteudoCompleto: null, // sem versão completa ainda — cai no texto curto mesmo
  },
];

export default function ResumosScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  function navegarParaVisualizador(item) {
    navigation.navigate('Visualizador', {
      type: 'resumo',
      dados: { conteudo: item.conteudoCompleto || item.texto },
    });
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={RESUMOS_MOCK}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          padding: spacing.md,
          paddingTop: insets.top + spacing.lg,
        }}
        ListHeaderComponent={<Text style={styles.header}>RESUMOS_</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => navegarParaVisualizador(item)} activeOpacity={0.6}>
            <Card>
              <View style={styles.linhaTopo}>
                <Text style={styles.titulo}>{item.nome}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textDim} />
              </View>
              <View style={styles.linhaBadges}>
                <StatusBadge label={item.materia} tone="outline" />
                <Text style={styles.periodo}>{item.periodo}</Text>
              </View>
              <Text style={styles.texto} numberOfLines={2}>
                {item.texto}
              </Text>
            </Card>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { fontSize: 16, fontFamily: font.mono, fontWeight: '700', letterSpacing: 1, color: colors.textPrimary, marginBottom: spacing.md },
  linhaTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  titulo: { fontSize: 14, fontFamily: font.mono, fontWeight: '700', color: colors.textPrimary, flex: 1, marginRight: spacing.sm },
  linhaBadges: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  periodo: { fontSize: 11, fontFamily: font.mono, color: colors.textDim },
  texto: { fontSize: 12, fontFamily: font.mono, lineHeight: 18, color: colors.textSecondary },
});