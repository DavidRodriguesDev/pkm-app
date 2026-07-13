import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Card } from '../components/Card';
import { colors, spacing, radius, font } from '../theme';
import { interpretarComando } from '../utils/comandosDeVoz';

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const TAREFAS_MOCK = [
  { id: '1', titulo: 'Trabalho de cálculo', prazoData: '2026-07-20', prazoHora: null, criadaEm: '2026-07-10', concluida: false, materia: 'Trabalho' },
  { id: '2', titulo: 'Pagar conta de luz', prazoData: '2026-07-15', prazoHora: '18:00', criadaEm: '2026-07-10', concluida: false, materia: 'Pessoal' },
];

// MOCK — não existe reconhecimento de voz real aqui ainda. A cada gravação
// simulada, o app pega a próxima frase dessa lista (em vez de um áudio de
// verdade) e manda pro interpretarComando(). Quando plugar STT de verdade,
// troca essa parte por "fraseReconhecida = textoQueVeioDoWhisper" — o
// resto do fluxo (processarComandoDeVoz) não precisa mudar em nada.
const FRASES_EXEMPLO = [
  'tenho que fazer uma atividade de matemática até amanhã às 5 horas da tarde',
  'realizei pagar conta de luz',
  'preciso fazer uma reunião de trabalho até hoje às 6 da tarde',
  'tenho que estudar física até depois de amanhã às 9 da manhã',
];

export default function TarefasScreen() {
  const insets = useSafeAreaInsets();
  const [tarefas, setTarefas] = useState(TAREFAS_MOCK);

  // fluxo de digitação manual (independente do de voz)
  const [texto, setTexto] = useState('');
  const [dataPrazoManual, setDataPrazoManual] = useState('');
  const [horaPrazoManual, setHoraPrazoManual] = useState('');
  const [mostrarPickerPrazo, setMostrarPickerPrazo] = useState(false);
  const [mostrarPickerHora, setMostrarPickerHora] = useState(false);

  const [materias, setMaterias] = useState(['Trabalho', 'Estudo', 'Pessoal']);
  const [materiaSelecionada, setMateriaSelecionada] = useState('Trabalho');
  const [novaMateriaTexto, setNovaMateriaTexto] = useState('');

  const [pendenteConfirmar, setPendenteConfirmar] = useState(null);

  // fluxo de comando de voz
  const [gravando, setGravando] = useState(false);
  const [tempoGravacao, setTempoGravacao] = useState(0);
  const [ultimoComando, setUltimoComando] = useState(null);
  const indiceFraseRef = useRef(0);

  useEffect(() => {
    let intervalo;
    if (gravando) {
      intervalo = setInterval(() => setTempoGravacao((t) => t + 1), 1000);
    }
    return () => clearInterval(intervalo);
  }, [gravando]);

  // some com o feedback do último comando sozinho depois de um tempo
  useEffect(() => {
    if (!ultimoComando) return;
    const timeout = setTimeout(() => setUltimoComando(null), 6000);
    return () => clearTimeout(timeout);
  }, [ultimoComando]);

  function formatarDuracao(segundos) {
    const min = Math.floor(segundos / 60);
    const sec = segundos % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }

  function formatarData(data) {
    if (!data) return '';
    const [ano, mes, dia] = data.split('-');
    if (!ano || !mes || !dia) return data;
    return `${dia}/${mes}`;
  }

  function processarComandoDeVoz(fraseReconhecida) {
    const resultado = interpretarComando(fraseReconhecida, tarefas);

    if (resultado.tipo === 'concluir') {
      setTarefas((prev) => prev.map((t) => (t.id === resultado.tarefaId ? { ...t, concluida: true } : t)));
      setUltimoComando({ ok: true, frase: fraseReconhecida, texto: `tarefa concluída: "${resultado.tituloEncontrado}"` });
      return;
    }

    if (resultado.tipo === 'criar') {
      const novaTarefa = {
        id: String(Date.now()),
        titulo: resultado.titulo,
        criadaEm: hojeISO(),
        prazoData: resultado.prazoData,
        prazoHora: resultado.prazoHora,
        materia: resultado.materiaSugerida,
        concluida: false,
      };
      setTarefas((prev) => [...prev, novaTarefa]);
      const prazoTexto = resultado.prazoData
        ? ` · prazo ${formatarData(resultado.prazoData)}${resultado.prazoHora ? ' ' + resultado.prazoHora : ''}`
        : '';
      setUltimoComando({
        ok: true,
        frase: fraseReconhecida,
        texto: `tarefa criada: "${resultado.titulo}" [${resultado.materiaSugerida}]${prazoTexto}`,
      });
      return;
    }

    setUltimoComando({ ok: false, frase: fraseReconhecida, texto: resultado.motivo });
  }

  function alternarGravacao() {
    if (gravando) {
      setGravando(false);
      setTempoGravacao(0);
      const frase = FRASES_EXEMPLO[indiceFraseRef.current % FRASES_EXEMPLO.length];
      indiceFraseRef.current += 1;
      processarComandoDeVoz(frase);
    } else {
      setGravando(true);
    }
  }

  function adicionarTarefaManual() {
    if (!texto.trim()) return;
    const tarefa = {
      id: String(Date.now()),
      titulo: texto,
      criadaEm: hojeISO(),
      prazoData: dataPrazoManual || null,
      prazoHora: horaPrazoManual || null,
      materia: materiaSelecionada,
      concluida: false,
    };
    setTarefas((prev) => [...prev, tarefa]);
    setTexto('');
    setDataPrazoManual('');
    setHoraPrazoManual('');
  }

  function onChangeDataPrazo(event, dataSelecionada) {
    setMostrarPickerPrazo(false);
    if (dataSelecionada) {
      const ano = dataSelecionada.getFullYear();
      const mes = String(dataSelecionada.getMonth() + 1).padStart(2, '0');
      const dia = String(dataSelecionada.getDate()).padStart(2, '0');
      setDataPrazoManual(`${ano}-${mes}-${dia}`);
    }
  }

  function onChangeHoraPrazo(event, dataSelecionada) {
    setMostrarPickerHora(false);
    if (dataSelecionada) {
      const h = String(dataSelecionada.getHours()).padStart(2, '0');
      const m = String(dataSelecionada.getMinutes()).padStart(2, '0');
      setHoraPrazoManual(`${h}:${m}`);
    }
  }

  function adicionarMateria() {
    const nome = novaMateriaTexto.trim();
    if (!nome || materias.includes(nome)) return;
    setMaterias((prev) => [...prev, nome]);
    setMateriaSelecionada(nome);
    setNovaMateriaTexto('');
  }

  function concluirTarefa(id) {
    setTarefas((prev) => prev.map((t) => (t.id === id ? { ...t, concluida: true } : t)));
    setPendenteConfirmar(null);
  }

  return (
    <View style={styles.container}>
      <View style={{ paddingTop: insets.top + spacing.lg, paddingHorizontal: spacing.md }}>
        <Text style={styles.header}>A_FAZER_</Text>
        <Text style={styles.dica} numberOfLines={2}>
          grave dizendo algo como "tenho que fazer X até amanhã às 5 da tarde" ou "realizei X" — ou digite abaixo
        </Text>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="digite uma tarefa"
            placeholderTextColor={colors.textDim}
            value={texto}
            onChangeText={setTexto}
            onSubmitEditing={adicionarTarefaManual}
          />
          <TouchableOpacity
            style={[styles.botaoIcone, gravando && styles.botaoIconeAtivo]}
            onPress={alternarGravacao}
          >
            <Ionicons name={gravando ? 'stop' : 'mic'} size={20} color={gravando ? colors.textPrimary : colors.onAccent} />
          </TouchableOpacity>
        </View>

        {gravando && <Text style={styles.gravandoTexto}>● OUVINDO COMANDO... {formatarDuracao(tempoGravacao)}</Text>}

        {ultimoComando && (
          <View style={[styles.comandoBox, !ultimoComando.ok && styles.comandoBoxErro]}>
            <Text style={styles.comandoFrase} numberOfLines={1}>🎙 "{ultimoComando.frase}"</Text>
            <Text style={styles.comandoResultado} numberOfLines={2}>
              {ultimoComando.ok ? '✓ ' : '✗ '}{ultimoComando.texto}
            </Text>
          </View>
        )}

        <View style={styles.inputsAvancados}>
          <View style={styles.inputRowSmall}>
            <TouchableOpacity style={styles.inputDataContainer} onPress={() => setMostrarPickerPrazo(true)}>
              <Ionicons name="calendar-outline" size={12} color={colors.textDim} />
              <Text style={styles.inputDataPlaceholder} numberOfLines={1}>
                {dataPrazoManual ? formatarData(dataPrazoManual) : 'data'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.inputDataContainer} onPress={() => setMostrarPickerHora(true)}>
              <Ionicons name="time-outline" size={12} color={colors.textDim} />
              <Text style={styles.inputDataPlaceholder} numberOfLines={1}>
                {horaPrazoManual || 'hora'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.materiasRow}>
            {materias.map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => setMateriaSelecionada(m)}
                style={[styles.chipMateria, materiaSelecionada === m && styles.chipMateriaAtivo]}
              >
                <Text style={[styles.chipMateriaText, materiaSelecionada === m && styles.chipMateriaTextAtivo]} numberOfLines={1}>
                  {m}
                </Text>
              </TouchableOpacity>
            ))}
            <View style={styles.inputContainerMateriaNova}>
              <TextInput
                style={[styles.inputMateriaNova, styles.chipMateria]}
                placeholder="+"
                placeholderTextColor={colors.textDim}
                value={novaMateriaTexto}
                onChangeText={setNovaMateriaTexto}
                onSubmitEditing={adicionarMateria}
              />
              <TouchableOpacity style={styles.botaoAddMateria} onPress={adicionarMateria}>
                <Ionicons name="add" size={14} color={colors.onAccent} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.adicionarRow}>
          <TouchableOpacity style={styles.botaoAdicionar} onPress={adicionarTarefaManual}>
            <Ionicons name="add" size={20} color={colors.onAccent} />
          </TouchableOpacity>
        </View>

        {mostrarPickerPrazo && (
          <DateTimePicker
            value={new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onChangeDataPrazo}
          />
        )}
        {mostrarPickerHora && (
          <DateTimePicker
            value={new Date()}
            mode="time"
            is24Hour
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onChangeHoraPrazo}
          />
        )}
      </View>

      <FlatList
        data={tarefas.filter((t) => !t.concluida)}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.md, paddingTop: spacing.sm }}
        renderItem={({ item }) => (
          <Card>
            <View style={styles.linha}>
              <View style={{ flex: 1 }}>
                <Text style={styles.titulo}>{item.titulo}</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.infoTexto}>criada {formatarData(item.criadaEm)}</Text>
                  {item.prazoData && (
                    <Text style={styles.infoTexto}>
                      prazo {formatarData(item.prazoData)}{item.prazoHora ? ` ${item.prazoHora}` : ''}
                    </Text>
                  )}
                  <Text style={styles.materia}>[{item.materia}]</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setPendenteConfirmar(item)}>
                <Ionicons name={item.concluida ? 'checkbox' : 'square-outline'} size={20} color={item.concluida ? colors.textPrimary : colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {pendenteConfirmar?.id === item.id && (
              <View style={styles.confirmBox}>
                <Text style={styles.confirmTexto}>concluir "{item.titulo}"?</Text>
                <View style={styles.confirmBotoes}>
                  <TouchableOpacity style={styles.botaoConfirmar} onPress={() => concluirTarefa(item.id)}>
                    <Text style={styles.botaoConfirmarTexto}>CONFIRMAR</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.botaoCancelar} onPress={() => setPendenteConfirmar(null)}>
                    <Text style={styles.botaoCancelarTexto}>CANCELAR</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { fontSize: 16, fontFamily: font.mono, fontWeight: '700', letterSpacing: 1, color: colors.textPrimary, marginBottom: 4 },
  dica: { fontSize: 10, fontFamily: font.mono, color: colors.textDim, marginBottom: spacing.md, lineHeight: 14 },
  inputRow: { flexDirection: 'row', gap: spacing.sm },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    height: 44,
    fontFamily: font.mono,
    fontSize: 13,
    color: colors.textPrimary,
  },
  botaoIcone: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoIconeAtivo: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong },
  gravandoTexto: { fontSize: 11, fontFamily: font.mono, color: colors.textPrimary, marginTop: spacing.xs },
  comandoBox: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  comandoBoxErro: { borderColor: colors.borderStrong },
  comandoFrase: { fontSize: 10, fontFamily: font.mono, color: colors.textDim, marginBottom: 2 },
  comandoResultado: { fontSize: 11, fontFamily: font.mono, color: colors.textPrimary },
  inputsAvancados: { marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  inputRowSmall: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  inputDataContainer: { flex: 1, minWidth: 0, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.sm, height: 34, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  inputDataPlaceholder: { flex: 1, color: colors.textSecondary, fontFamily: font.mono, fontSize: 11 },
  materiasRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', marginTop: spacing.sm, flexWrap: 'wrap' },
  chipMateria: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipMateriaAtivo: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipMateriaText: { fontSize: 10, fontFamily: font.mono, color: colors.textSecondary, maxWidth: 90 },
  chipMateriaTextAtivo: { color: colors.onAccent, fontWeight: '700' },
  inputContainerMateriaNova: { flexDirection: 'row', alignItems: 'center' },
  inputMateriaNova: { width: 30, textAlign: 'center', paddingVertical: spacing.xs, fontFamily: font.mono, color: colors.textPrimary },
  botaoAddMateria: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  adicionarRow: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.sm },
  botaoAdicionar: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: 4 },
  titulo: { fontSize: 14, fontFamily: font.mono, fontWeight: '700', color: colors.textPrimary },
  infoTexto: { fontSize: 10, fontFamily: font.mono, color: colors.textDim },
  materia: { fontSize: 10, fontFamily: font.mono, color: colors.textSecondary, marginTop: 2 },
  confirmBox: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  confirmTexto: { fontSize: 12, fontFamily: font.mono, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm },
  confirmBotoes: { flexDirection: 'row', gap: spacing.sm },
  botaoConfirmar: { flex: 1, backgroundColor: colors.accent, borderRadius: radius.sm, paddingVertical: spacing.xs, alignItems: 'center' },
  botaoConfirmarTexto: { color: colors.onAccent, fontSize: 10, fontFamily: font.mono, fontWeight: '700' },
  botaoCancelar: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingVertical: spacing.xs, alignItems: 'center' },
  botaoCancelarTexto: { color: colors.textSecondary, fontSize: 10, fontFamily: font.mono },
});