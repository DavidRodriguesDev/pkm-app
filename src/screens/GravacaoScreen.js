import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../theme';

export default function GravacaoScreen({ route, navigation }) {
  const { tipo = 'nota', titulo, materia } = route.params ?? {};
  const insets = useSafeAreaInsets();
  const [gravando, setGravando] = useState(false);

  const ehAula = tipo === 'aula';

  // A transcrição real vem do whisper.cpp rodando local depois.
  const transcricaoMock =
    'a rede neural aprende os pesos através do gradiente descendente, ajustando...';

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <Text style={styles.header}>
        {ehAula ? 'Aulas' : 'Notas'}
        {titulo ? ` · ${titulo}` : ' · novo bloco'}
      </Text>
      {ehAula && materia && <Text style={styles.subheader}>{materia}</Text>}

      <View style={styles.transcricaoBox}>
        <Text style={styles.transcricaoTexto}>
          {gravando ? transcricaoMock : 'Toque em gravar para começar'}
        </Text>
      </View>

      <View style={styles.controles}>
        {/* Anexar foto/documento só faz sentido em Aulas, não em Notas */}
        {ehAula && (
          <TouchableOpacity onPress={() => {}}>
            <Ionicons name="image-outline" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={() => {}}>
          <Ionicons name="pause-outline" size={24} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.botaoRec} onPress={() => setGravando((g) => !g)}>
          <Ionicons name={gravando ? 'stop' : 'mic'} size={28} color="#fff" />
        </TouchableOpacity>

        {ehAula && (
          <TouchableOpacity onPress={() => {}}>
            <Ionicons name="document-outline" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity style={styles.botaoFinalizar} onPress={() => navigation.goBack()}>
        <Text style={styles.botaoFinalizarTexto}>Finalizar bloco</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    justifyContent: 'space-between',
  },
  header: { fontSize: 13, color: colors.textSecondary },
  subheader: { fontSize: 12, color: colors.accent, marginTop: 2 },
  transcricaoBox: { flex: 1, justifyContent: 'center', paddingVertical: spacing.xl },
  transcricaoTexto: { fontSize: 16, lineHeight: 26, color: colors.textPrimary, textAlign: 'center' },
  controles: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: spacing.lg,
  },
  botaoRec: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoFinalizar: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  botaoFinalizarTexto: { color: '#fff', fontWeight: '500', fontSize: 14 },
});
