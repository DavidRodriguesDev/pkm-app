import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card, StatusBadge } from '../components/Card';
import { colors, spacing, radius } from '../theme';

const AULAS_MOCK = [
  { id: '1', titulo: 'Aula 03 - Limites', materia: 'Cálculo II', selecionada: true },
  { id: '2', titulo: 'Aula 04 - Derivadas', materia: 'Cálculo II', selecionada: true },
  { id: '3', titulo: 'Aula 01 - Cinemática', materia: 'Física I', selecionada: false },
];

export default function AulasScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [materias, setMaterias] = useState(['Cálculo II', 'Física I']);
  const [materiaAtiva, setMateriaAtiva] = useState('Todas');
  const [aulas, setAulas] = useState(AULAS_MOCK);

  // Estado do formulário de "nova aula"
  const [modalVisivel, setModalVisivel] = useState(false);
  const [novoTitulo, setNovoTitulo] = useState('');
  const [materiaEscolhida, setMateriaEscolhida] = useState(materias[0]);
  const [novaMateriaTexto, setNovaMateriaTexto] = useState('');

  function alternarSelecao(id) {
    setAulas((prev) =>
      prev.map((a) => (a.id === id ? { ...a, selecionada: !a.selecionada } : a))
    );
  }

  function adicionarMateria() {
    const nome = novaMateriaTexto.trim();
    if (!nome || materias.includes(nome)) return;
    setMaterias((prev) => [...prev, nome]);
    setMateriaEscolhida(nome);
    setNovaMateriaTexto('');
  }

  function confirmarNovaAula() {
    if (!novoTitulo.trim()) return;
    setModalVisivel(false);
    const titulo = novoTitulo;
    const materia = materiaEscolhida;
    setNovoTitulo('');
    // Vai pra tela de gravação já sabendo o título e a matéria dessa aula
    navigation.navigate('Gravacao', { tipo: 'aula', titulo, materia });
  }

  const aulasFiltradas =
    materiaAtiva === 'Todas' ? aulas : aulas.filter((a) => a.materia === materiaAtiva);

  return (
    <View style={styles.container}>
      <View style={{ paddingTop: insets.top + spacing.lg, paddingHorizontal: spacing.md }}>
        <Text style={styles.header}>Aulas</Text>

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={['Todas', ...materias]}
          keyExtractor={(item) => item}
          style={styles.chipsRow}
          renderItem={({ item: m }) => (
            <TouchableOpacity
              onPress={() => setMateriaAtiva(m)}
              style={[styles.chip, materiaAtiva === m && styles.chipAtivo]}
            >
              <Text style={[styles.chipText, materiaAtiva === m && styles.chipTextAtivo]}>
                {m}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={aulasFiltradas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.md, paddingTop: spacing.sm }}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => alternarSelecao(item.id)}>
            <Card style={item.selecionada && styles.cardSelecionado}>
              <View style={styles.linha}>
                <Text style={styles.titulo}>{item.titulo}</Text>
                <Ionicons
                  name={item.selecionada ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={item.selecionada ? colors.accent : colors.textSecondary}
                />
              </View>
              <StatusBadge label={item.materia} tone="accent" />
            </Card>
          </TouchableOpacity>
        )}
      />

      <View style={styles.rodape}>
        <TouchableOpacity
          style={styles.botaoResumir}
          onPress={() => {
            // Aqui entra a chamada pro endpoint /resumir com os sessao_ids selecionados
          }}
        >
          <Text style={styles.botaoResumirTexto}>Resumir selecionadas</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.fab} onPress={() => setModalVisivel(true)}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Modal de criação de nova aula: título + matéria (existente ou nova) */}
      <Modal visible={modalVisivel} transparent animationType="slide">
        <View style={styles.modalFundo}>
          <View style={styles.modalCaixa}>
            <Text style={styles.modalTitulo}>Nova aula</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Título da aula"
              placeholderTextColor={colors.textSecondary}
              value={novoTitulo}
              onChangeText={setNovoTitulo}
            />

            <Text style={styles.modalLabel}>Matéria</Text>
            <View style={styles.chipsWrap}>
              {materias.map((m) => (
                <TouchableOpacity
                  key={m}
                  onPress={() => setMateriaEscolhida(m)}
                  style={[styles.chip, materiaEscolhida === m && styles.chipAtivo]}
                >
                  <Text style={[styles.chipText, materiaEscolhida === m && styles.chipTextAtivo]}>
                    {m}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.novaMateriaRow}>
              <TextInput
                style={[styles.modalInput, { flex: 1, marginBottom: 0 }]}
                placeholder="Adicionar nova matéria"
                placeholderTextColor={colors.textSecondary}
                value={novaMateriaTexto}
                onChangeText={setNovaMateriaTexto}
              />
              <TouchableOpacity style={styles.botaoAddMateria} onPress={adicionarMateria}>
                <Ionicons name="add" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBotoes}>
              <TouchableOpacity
                style={styles.botaoCancelar}
                onPress={() => setModalVisivel(false)}
              >
                <Text style={styles.botaoCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.botaoConfirmar} onPress={confirmarNovaAula}>
                <Text style={styles.botaoConfirmarTexto}>Iniciar gravação</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { fontSize: 18, fontWeight: '500', color: colors.textPrimary, marginBottom: spacing.md },
  chipsRow: { flexGrow: 0, marginBottom: spacing.sm },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    marginRight: spacing.sm,
  },
  chipAtivo: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontSize: 12, color: colors.textSecondary },
  chipTextAtivo: { color: '#fff', fontWeight: '500' },
  linha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  titulo: { fontSize: 15, fontWeight: '500', color: colors.textPrimary },
  cardSelecionado: { borderColor: colors.accent, borderWidth: 1.5 },
  rodape: { padding: spacing.md, gap: spacing.sm },
  botaoResumir: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  botaoResumirTexto: { fontSize: 13, color: colors.textPrimary, fontWeight: '500' },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl + 40,
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  modalFundo: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCaixa: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    padding: spacing.lg,
  },
  modalTitulo: { fontSize: 16, fontWeight: '500', color: colors.textPrimary, marginBottom: spacing.md },
  modalLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: spacing.sm },
  modalInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 44,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  novaMateriaRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg, alignItems: 'center' },
  botaoAddMateria: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBotoes: { flexDirection: 'row', gap: spacing.sm },
  botaoCancelar: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  botaoCancelarTexto: { color: colors.textSecondary, fontSize: 13 },
  botaoConfirmar: {
    flex: 2,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  botaoConfirmarTexto: { color: '#fff', fontSize: 13, fontWeight: '500' },
});
