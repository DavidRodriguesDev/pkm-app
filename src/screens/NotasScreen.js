import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, radius, font } from '../theme';

const NOTAS_MOCK = [
  { id: '1', titulo: 'Ideias de fim de semana', conteudo: 'Ler mais sobre produtividade, tentar novas receitas', criadaEm: '11/07/2026 09:30', audio: null },
  { id: '2', titulo: 'Reflexão sobre hábitos', conteudo: 'Manter rotina de exercícios, dormir cedo', criadaEm: '11/07/2026 10:15', audio: null },
];

// MOCK — texto "falado" usado pra simular a transcrição chegando aos
// poucos, palavra por palavra, enquanto a gravação está rolando (como um
// STT em streaming faria de verdade). Em produção, isso seria substituído
// pelas partial results de um serviço de transcrição real (ex: Whisper
// streaming, Google STT streaming) chegando via WebSocket/callback — a UI
// abaixo (o setNovoConteudo por palavra) já está pronta pra receber isso.
const FRASE_TRANSCRICAO =
  'Hoje pensei bastante sobre como organizar melhor meus estudos e percebi que preciso criar uma rotina mais consistente durante a semana, separando um horário fixo pra cada matéria.'.split(' ');

export default function NotasScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [notas, setNotas] = useState(NOTAS_MOCK);
  const [modalVisivel, setModalVisivel] = useState(false);
  const [novoTitulo, setNovoTitulo] = useState('');
  const [novoConteudo, setNovoConteudo] = useState('');
  const [tempoGravacao, setTempoGravacao] = useState(0);
  const [gravando, setGravando] = useState(false);
  const [audioInfo, setAudioInfo] = useState(null); // null | { duracao, arquivo }

  const indicePalavraRef = useRef(0);
  const intervaloTranscricaoRef = useRef(null);
  const intervaloTempoRef = useRef(null);

  useEffect(() => {
    if (gravando) {
      intervaloTempoRef.current = setInterval(() => setTempoGravacao((t) => t + 1), 1000);
    }
    return () => clearInterval(intervaloTempoRef.current);
  }, [gravando]);

  // Escreve a transcrição EM TEMPO REAL enquanto grava, palavra por
  // palavra — é aqui que entraria o streaming de um STT real (ver
  // comentário no topo do arquivo).
  useEffect(() => {
    if (gravando) {
      indicePalavraRef.current = 0;
      setNovoConteudo('');
      intervaloTranscricaoRef.current = setInterval(() => {
        if (indicePalavraRef.current >= FRASE_TRANSCRICAO.length) {
          clearInterval(intervaloTranscricaoRef.current);
          return;
        }
        const palavra = FRASE_TRANSCRICAO[indicePalavraRef.current];
        setNovoConteudo((prev) => (prev ? `${prev} ${palavra}` : palavra));
        indicePalavraRef.current += 1;
      }, 220);
    } else {
      clearInterval(intervaloTranscricaoRef.current);
    }
    return () => clearInterval(intervaloTranscricaoRef.current);
  }, [gravando]);

  function formatarDuracao(segundos) {
    const min = Math.floor(segundos / 60);
    const sec = segundos % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }

  function formatarDataHoraBr() {
    const agora = new Date();
    const dia = String(agora.getDate()).padStart(2, '0');
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const ano = agora.getFullYear();
    const hora = String(agora.getHours()).padStart(2, '0');
    const min = String(agora.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${ano} ${hora}:${min}`;
  }

  function alternarGravacao() {
    if (gravando) {
      setGravando(false);
      // MOCK de armazenamento: em produção, aqui é onde o arquivo de
      // áudio gravado (via expo-audio) seria salvo localmente
      // (expo-file-system) e/ou enviado pro backend, guardando a URI
      // real em vez desse nome de arquivo fake.
      setAudioInfo({
        duracao: tempoGravacao,
        arquivo: `nota_audio_${Date.now()}.m4a`,
      });
      setTempoGravacao(0);
    } else {
      setAudioInfo(null);
      setGravando(true);
    }
  }

  function adicionarNota() {
    if (!novoTitulo.trim()) return;
    const nota = {
      id: String(Date.now()),
      titulo: novoTitulo,
      conteudo: novoConteudo,
      criadaEm: formatarDataHoraBr(),
      audio: audioInfo,
    };
    setNotas((prev) => [...prev, nota]);
    fecharModal();
  }

  function fecharModal() {
    setModalVisivel(false);
    setGravando(false);
    setTempoGravacao(0);
    setNovoTitulo('');
    setNovoConteudo('');
    setAudioInfo(null);
  }

  function navegarParaVisualizador(item) {
    navigation.navigate('Visualizador', { type: 'nota', dados: { conteudo: item.conteudo } });
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={notas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.md, paddingTop: insets.top + spacing.lg }}
        ListHeaderComponent={<Text style={styles.header}>NOTAS_MENTAIS_</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => navegarParaVisualizador(item)} activeOpacity={0.6}>
            <View style={styles.cardConteudo}>
              <View style={styles.tituloRow}>
                <Text style={styles.titulo}>{item.titulo}</Text>
                {item.audio && <Ionicons name="mic" size={11} color={colors.textDim} style={{ marginLeft: 6 }} />}
              </View>
              <Text style={styles.data}>{item.criadaEm}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisivel(true)}>
        <Ionicons name="mic" size={24} color={colors.onAccent} />
      </TouchableOpacity>

      <Modal visible={modalVisivel} transparent animationType="slide">
        <View style={styles.modalFundo}>
          <View style={styles.modalCaixa}>
            <Text style={styles.modalTitulo}>&gt; NOVA_NOTA</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="título da nota"
              placeholderTextColor={colors.textDim}
              value={novoTitulo}
              onChangeText={setNovoTitulo}
            />

            <TextInput
              style={styles.modalInputMultiline}
              placeholder="conteúdo da nota (digite ou grave)"
              placeholderTextColor={colors.textDim}
              value={novoConteudo}
              onChangeText={setNovoConteudo}
              multiline
              numberOfLines={6}
            />

            {gravando && (
              <View style={styles.gravandoBox}>
                <View style={styles.gravandoBarra}>
                  {[...Array(10)].map((_, i) => (
                    <View key={i} style={[styles.barraPonto, { height: Math.random() * 14 + 6 }]} />
                  ))}
                </View>
                <Text style={styles.gravandoTexto}>● GRAVANDO... {formatarDuracao(tempoGravacao)} — transcrevendo em tempo real</Text>
              </View>
            )}

            {!gravando && audioInfo && (
              <View style={styles.audioSalvoBox}>
                <Ionicons name="checkmark-circle-outline" size={14} color={colors.textPrimary} />
                <Text style={styles.audioSalvoTexto}>
                  áudio gravado ({formatarDuracao(audioInfo.duracao)}) e armazenado · {audioInfo.arquivo}
                </Text>
              </View>
            )}

            <View style={styles.modalBotoes}>
              <TouchableOpacity style={styles.botaoCancelar} onPress={fecharModal}>
                <Text style={styles.botaoCancelarTexto}>CANCELAR</Text>
              </TouchableOpacity>

              <View style={styles.gravarContainer}>
                <TouchableOpacity
                  style={[styles.botaoGravar, gravando && styles.botaoGravarAtivo]}
                  onPress={alternarGravacao}
                >
                  <Ionicons name={gravando ? 'stop' : 'mic'} size={20} color={gravando ? colors.textPrimary : colors.onAccent} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.botaoSalvar} onPress={adicionarNota}>
                <Text style={styles.botaoSalvarTexto}>SALVAR</Text>
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
  card: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardConteudo: { flex: 1, marginRight: spacing.sm },
  tituloRow: { flexDirection: 'row', alignItems: 'center' },
  titulo: { fontSize: 14, fontFamily: font.mono, fontWeight: '700', color: colors.textPrimary },
  data: { fontSize: 10, fontFamily: font.mono, color: colors.textDim, marginTop: 2 },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 52,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  modalFundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCaixa: {
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  modalTitulo: { fontSize: 14, fontFamily: font.mono, fontWeight: '700', letterSpacing: 1, color: colors.textPrimary, marginBottom: spacing.md },
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
  modalInputMultiline: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 120,
    fontFamily: font.mono,
    fontSize: 13,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlignVertical: 'top',
  },
  gravandoBox: { marginBottom: spacing.sm },
  gravandoBarra: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, marginBottom: 4, height: 20 },
  barraPonto: { width: 4, backgroundColor: colors.textPrimary, borderRadius: radius.full },
  gravandoTexto: { fontSize: 10, fontFamily: font.mono, color: colors.textPrimary },
  audioSalvoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  audioSalvoTexto: { flex: 1, fontSize: 10, fontFamily: font.mono, color: colors.textSecondary },
  modalBotoes: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  botaoCancelar: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingVertical: spacing.sm, alignItems: 'center' },
  botaoCancelarTexto: { color: colors.textSecondary, fontSize: 11, fontFamily: font.mono },
  gravarContainer: { width: 44, height: 44 },
  botaoGravar: { width: 44, height: 44, borderRadius: radius.full, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  botaoGravarAtivo: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong },
  botaoSalvar: { flex: 2, backgroundColor: colors.accent, borderRadius: radius.sm, paddingVertical: spacing.sm, alignItems: 'center' },
  botaoSalvarTexto: { color: colors.onAccent, fontSize: 11, fontFamily: font.mono, fontWeight: '700' },
});