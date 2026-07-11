import { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card, StatusBadge } from '../components/Card';
import { colors, spacing, radius } from '../theme';

// Dados mockados por enquanto — depois isso vem do SQLite local
const SESSOES_MOCK = [
  { id: '1', titulo: 'Ideias de fim de semana', status: 'aguardando' },
  { id: '2', titulo: 'Reflexão sobre hábitos', status: 'processado' },
  { id: '3', titulo: 'Ideia - app de receitas', status: 'processado' },
];

export default function NotasScreen({ navigation }) {
  const [sessoes] = useState(SESSOES_MOCK);
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <FlatList
        data={sessoes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          padding: spacing.md,
          paddingTop: insets.top + spacing.lg,
        }}
        ListHeaderComponent={<Text style={styles.header}>Notas mentais</Text>}
        renderItem={({ item }) => (
          <Card>
            <Text style={styles.titulo}>{item.titulo}</Text>
            {item.status === 'aguardando' ? (
              <StatusBadge label="Aguardando sincronização" tone="warning" />
            ) : (
              <StatusBadge label="Processado" tone="success" />
            )}
          </Card>
        )}
      />

      {/* Notas é só captura por voz — não faz sentido anexar foto/documento aqui */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('Gravacao', { tipo: 'nota' })}
      >
        <Ionicons name="mic" size={26} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { fontSize: 18, fontWeight: '500', color: colors.textPrimary, marginBottom: spacing.md },
  titulo: { fontSize: 15, fontWeight: '500', color: colors.textPrimary, marginBottom: spacing.xs },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
});
