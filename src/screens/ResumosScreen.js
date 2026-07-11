import { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card, StatusBadge } from '../components/Card';
import { colors, spacing } from '../theme';

// Mock — depois isso vem da tabela Resumos, populada pelo endpoint /resumir
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
  },
];

export default function ResumosScreen() {
  const insets = useSafeAreaInsets();
  const [expandidoId, setExpandidoId] = useState(null);

  return (
    <View style={styles.container}>
      <FlatList
        data={RESUMOS_MOCK}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          padding: spacing.md,
          paddingTop: insets.top + spacing.lg,
        }}
        ListHeaderComponent={<Text style={styles.header}>Resumos</Text>}
        renderItem={({ item }) => {
          const expandido = expandidoId === item.id;
          return (
            <TouchableOpacity
              onPress={() => setExpandidoId(expandido ? null : item.id)}
              activeOpacity={0.8}
            >
              <Card>
                <View style={styles.linhaTopo}>
                  <Text style={styles.titulo}>{item.nome}</Text>
                  <Ionicons
                    name={expandido ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={colors.textSecondary}
                  />
                </View>
                <View style={styles.linhaBadges}>
                  <StatusBadge label={item.materia} tone="accent" />
                  <Text style={styles.periodo}>{item.periodo}</Text>
                </View>
                <Text
                  style={styles.texto}
                  numberOfLines={expandido ? undefined : 2}
                >
                  {item.texto}
                </Text>
              </Card>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { fontSize: 18, fontWeight: '500', color: colors.textPrimary, marginBottom: spacing.md },
  linhaTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  titulo: { fontSize: 15, fontWeight: '500', color: colors.textPrimary, flex: 1, marginRight: spacing.sm },
  linhaBadges: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  periodo: { fontSize: 12, color: colors.textSecondary },
  texto: { fontSize: 13, lineHeight: 20, color: colors.textSecondary },
});
