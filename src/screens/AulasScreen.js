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
import { colors, spacing, radius, font } from '../theme';
import { Card, StatusBadge } from '../components/Card';

// Estado inicial: lista de aulas com mensagens simuladas
const AULAS_MOCK = [
  {
    id: '1',
    titulo: 'Aula 03 - Limites',
    materia: 'Cálculo II',
    selecionada: true,
    messages: [
      { id: '1', tipo: 'text', texto: 'Bom dia, hoje vamos ver limites', remetente: 'eu', hora: '09:00' },
      { id: '2', tipo: 'text', texto: 'Lembrem da fórmula básica...', remetente: 'eu', hora: '09:05' },
    ],
  },
  {
    id: '2',
    titulo: 'Aula 04 - Derivadas',
    materia: 'Cálculo II',
    selecionada: true,
    messages: [
      { id: '1', tipo: 'text', texto: 'Continuando com derivadas', remetente: 'eu', hora: '10:00' },
    ],
  },
  {
    id: '3',
    titulo: 'Aula 01 - Cinemática',
    materia: 'Física I',
    selecionada: false,
    messages: [],
  },
];

export default function AulasScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [materias, setMaterias] = useState(['Cálculo II', 'Física I']);
  const [materiaAtiva, setMateriaAtiva] = useState('Todas');
  const [aulas, setAulas] = useState(AULAS_MOCK);
  const [novaAulaVisivel, setNovaAulaVisivel] = useState(false);
  const [novasAulas, setNovasAulas] = useState([]);

  const [novaMateriaTexto, setNovaMateriaTexto] = useState('');
  const [novoTitulo, setNovoTitulo] = useState('');
  const [materiaModal, setMateriaModal] = useState(materias[0]);

  function alternarSelecao(id) {
    setAulas((prev) =>
      prev.map((a) => (a.id === id ? { ...a, selecionada: !a.selecionada } : a))
    );
  }

  function adicionarMateria() {
    const nome = novaMateriaTexto.trim();
    if (!nome || materias.includes(nome)) return;
    setMaterias((prev) => [...prev, nome]);
    setMateriaModal(nome);
    setNovaMateriaTexto('');
  }

  function criarNovaAula() {
    if (!novoTitulo.trim()) return;
    const novaAula = {
      id: String(Date.now()),
      titulo: novoTitulo,
      materia: materiaModal, // usa a matéria escolhida no modal, não mais fixo em materias[0]
      selecionada: true,
      messages: [],
    };
    setNovasAulas((prev) => [...prev, novaAula]);
    setNovaAulaVisivel(false);
    setNovoTitulo('');
    navigation.navigate('ChatAula', { aula: novaAula });
  }

  const aulasFiltradas = [...novasAulas, ...aulas].filter(
    (a) => materiaAtiva === 'Todas' || a.materia === materiaAtiva
  );

  return (
    <View style={styles.container}>
      <View style={{ paddingTop: insets.top + spacing.lg, paddingHorizontal: spacing.md }}>
        <Text style={styles.header}>AULAS_</Text>

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
          <TouchableOpacity
            onPress={() => navigation.navigate('ChatAula', { aula: item })}
            onLongPress={() => alternarSelecao(item.id)}
            activeOpacity={0.6}
          >
            <Card style={item.selecionada ? styles.cardSelecionado : undefined}>
              <View style={styles.linha}>
                <View style={{ flex: 1 }}>
                  <View style={styles.linhaSuperior}>
                    <Text style={styles.titulo}>{item.titulo}</Text>
                    <Ionicons
                      name={item.selecionada ? 'checkbox' : 'square-outline'}
                      size={16}
                      color={item.selecionada ? colors.textPrimary : colors.textDim}
                    />
                  </View>
                  <StatusBadge label={item.materia} tone="outline" />
                  {item.messages.length > 0 && (
                    <Text style={styles.ultimaMsg} numberOfLines={1}>
                      {item.messages[item.messages.length - 1].texto}
                    </Text>
                  )}
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        )}
      />

      <View style={styles.rodape}>
        <TouchableOpacity
          style={styles.botaoResumir}
          onPress={() => {
            // Resumir selecionadas
          }}
        >
          <Text style={styles.botaoResumirTexto}>RESUMIR SELECIONADAS</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.fab} onPress={() => { setMateriaModal(materias[0]); setNovaAulaVisivel(true); }}>
          <Ionicons name="add" size={26} color={colors.onAccent} />
        </TouchableOpacity>
      </View>

      <Modal visible={novaAulaVisivel} transparent animationType="slide">
        <View style={styles.modalFundo}>
          <View style={styles.modalCaixa}>
            <Text style={styles.modalTitulo}>&gt; NOVA_AULA</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="título da aula"
              placeholderTextColor={colors.textDim}
              value={novoTitulo}
              onChangeText={setNovoTitulo}
            />

            <Text style={styles.modalLabel}>matéria</Text>
            <View style={styles.chipsWrap}>
              {materias.map((m) => (
                <TouchableOpacity
                  key={m}
                  onPress={() => setMateriaModal(m)}
                  style={[styles.chip, materiaModal === m && styles.chipAtivo]}
                >
                  <Text style={[styles.chipText, materiaModal === m && styles.chipTextAtivo]}>
                    {m}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.novaMateriaRow}>
              <TextInput
                style={[styles.modalInput, { flex: 1, marginBottom: 0 }]}
                placeholder="adicionar nova matéria"
                placeholderTextColor={colors.textDim}
                value={novaMateriaTexto}
                onChangeText={setNovaMateriaTexto}
              />
              <TouchableOpacity style={styles.botaoAddMateria} onPress={adicionarMateria}>
                <Ionicons name="add" size={18} color={colors.onAccent} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBotoes}>
              <TouchableOpacity
                style={styles.botaoCancelar}
                onPress={() => setNovaAulaVisivel(false)}
              >
                <Text style={styles.botaoCancelarTexto}>CANCELAR</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.botaoConfirmar} onPress={criarNovaAula}>
                <Text style={styles.botaoConfirmarTexto}>CRIAR E COMEÇAR</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { fontSize: 16, fontFamily: font.mono, fontWeight: '700', letterSpacing: 1, color: colors.textPrimary, marginBottom: spacing.md },
  chipsRow: { flexGrow: 0, marginBottom: spacing.sm },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
  },
  chipAtivo: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontSize: 11, fontFamily: font.mono, color: colors.textSecondary },
  chipTextAtivo: { color: colors.onAccent, fontWeight: '700' },
  linha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  linhaSuperior: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  titulo: { fontSize: 14, fontFamily: font.mono, fontWeight: '700', color: colors.textPrimary, flex: 1, marginRight: spacing.sm },
  ultimaMsg: { fontSize: 12, fontFamily: font.mono, color: colors.textDim, marginTop: spacing.xs },
  cardSelecionado: { borderColor: colors.borderStrong, borderWidth: 1 },
  rodape: { padding: spacing.md, gap: spacing.sm },
  botaoResumir: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  botaoResumirTexto: { fontSize: 11, fontFamily: font.mono, color: colors.textPrimary, fontWeight: '700', letterSpacing: 0.5 },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl + 40,
    width: 52,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  modalFundo: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalCaixa: {
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  modalTitulo: { fontSize: 14, fontFamily: font.mono, fontWeight: '700', letterSpacing: 1, color: colors.textPrimary, marginBottom: spacing.md },
  modalLabel: { fontSize: 10, fontFamily: font.mono, letterSpacing: 1, textTransform: 'uppercase', color: colors.textDim, marginBottom: spacing.sm },
  modalInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    height: 44,
    fontFamily: font.mono,
    fontSize: 13,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  novaMateriaRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg, alignItems: 'center' },
  botaoAddMateria: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBotoes: { flexDirection: 'row', gap: spacing.sm },
  botaoCancelar: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  botaoCancelarTexto: { color: colors.textSecondary, fontSize: 11, fontFamily: font.mono },
  botaoConfirmar: {
    flex: 2,
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  botaoConfirmarTexto: { color: colors.onAccent, fontSize: 11, fontFamily: font.mono, fontWeight: '700' },
});
