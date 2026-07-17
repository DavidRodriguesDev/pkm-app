import { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Card } from '../components/Card';
import { colors, spacing, radius, font } from '../theme';
import { tarefasRepository, materiasRepository, initDatabase } from '../repositories/tarefasRepository';
import { ModalConfirmacao } from '../components/ModalConfirmacao';
import { useAi } from '../ai/AiProvider';
import { useGravador } from '../hooks/useGravador';

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function TarefasScreen() {
  const insets = useSafeAreaInsets();
  const [tarefas, setTarefas] = useState([]);
  const [materias, setMaterias] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // fluxo de digitação manual (independente do de voz)
  const [texto, setTexto] = useState('');
  const [dataPrazoManual, setDataPrazoManual] = useState('');
  const [horaPrazoManual, setHoraPrazoManual] = useState('');
  const [mostrarPickerPrazo, setMostrarPickerPrazo] = useState(false);
  const [mostrarPickerHora, setMostrarPickerHora] = useState(false);
  const [materiaSelecionada, setMateriaSelecionada] = useState('Trabalho');
  const [novaMateriaTexto, setNovaMateriaTexto] = useState('');

  // Estado do modal de confirmação
  const [modalVisivel, setModalVisivel] = useState(false);
  const [tarefaPendente, setTarefaPendente] = useState(null);

  // Interpretador LLM + transcrição — instância única compartilhada por
  // todo o app (ver src/ai/AiProvider.js). Isso evita ter mais de uma
  // instância do mesmo modelo viva ao mesmo tempo (o
  // react-native-executorch só suporta um "model runner" ativo por vez).
  const { transcricao, interpretador, interpretarComando } = useAi();

  // fluxo de comando de voz — grava, depois transcreve
  const gravador = useGravador();
  const [transcrevendo, setTranscrevendo] = useState(false);
  const [ultimoComando, setUltimoComando] = useState(null);

  // Inicializar banco de dados
  useEffect(() => {
    (async () => {
      try {
        await initDatabase();
        await carregarDados();
      } catch (e) {
        console.error('[Tarefas] Erro ao inicializar:', e);
      } finally {
        setCarregando(false);
      }
    })();
  }, []);

  // Recarregar dados quando o componente montar ou mudar
  async function carregarDados() {
    const listaTarefas = await tarefasRepository.list(false);
    const listaMaterias = await materiasRepository.list();
    setTarefas(listaTarefas);
    setMaterias(listaMaterias);
    if (listaMaterias.length > 0) {
      setMateriaSelecionada(listaMaterias[0].nome);
    }
  }

  // fluxo de digitação manual (independente do de voz)
  const [pendenteConfirmar, setPendenteConfirmar] = useState(null);

  // fluxo de comando de voz
  const [ultimaFrase, setUltimaFrase] = useState('');

  // some com o feedback do último comando sozinho depois de um tempo
  useEffect(() => {
    if (!ultimoComando) return;
    const timeout = setTimeout(() => setUltimoComando(null), 6000);
    return () => clearTimeout(timeout);
  }, [ultimoComando]);

  // Processar resultado da interpretação LLM
  useEffect(() => {
    if (interpretador.erro) {
      setUltimoComando({ ok: false, frase: ultimaFrase, texto: `Erro: ${interpretador.erro}` });
      return;
    }

    if (interpretador.estaProcessando) return;

    if (interpretador.resultado) {
      const res = interpretador.resultado;
      if (res.tipo === 'criar' && res.titulo) {
        // Mostrar modal de confirmação
        setTarefaPendente({
          titulo: res.titulo,
          materia: res.materia,
          dataPrazo: res.dataPrazo,
        });
        setModalVisivel(true);
      } else if (res.tipo === 'concluir' && res.tarefaId) {
        tarefasRepository.concluir(res.tarefaId);
        carregarDados();
        setUltimoComando({ ok: true, frase: ultimaFrase, texto: `tarefa concluída [ID ${res.tarefaId}]` });
      }
    }
  }, [interpretador.resultado, interpretador.erro, interpretador.estaProcessando, ultimaFrase]);

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
    setUltimaFrase(fraseReconhecida);
    interpretarComando(fraseReconhecida, tarefas, materias);
  }

  async function alternarGravacao() {
    if (gravador.gravando) {
      const uri = await gravador.parar();
      if (!uri) return;
      setTranscrevendo(true);
      try {
        const frase = await transcricao.transcrever(uri);
        if (frase?.trim()) {
          processarComandoDeVoz(frase.trim());
        } else {
          setUltimoComando({ ok: false, frase: '', texto: 'não entendi nada no áudio, tenta de novo' });
        }
      } catch (e) {
        console.error('[Tarefas] Erro na transcrição:', e);
        setUltimoComando({ ok: false, frase: '', texto: `erro ao transcrever: ${e.message || 'desconhecido'}` });
      } finally {
        setTranscrevendo(false);
      }
    } else {
      try {
        await gravador.iniciar();
      } catch (e) {
        console.error('[Tarefas] Erro ao iniciar gravação:', e);
        setUltimoComando({ ok: false, frase: '', texto: `erro ao iniciar: ${e.message || 'desconhecido'}` });
      }
    }
  }

  async function adicionarTarefaManual() {
    if (!texto.trim()) return;
    const novaTarefa = {
      titulo: texto,
      materia: materiaSelecionada,
      dataPrazo: dataPrazoManual || null,
      horaPrazo: horaPrazoManual || null,
    };
    try {
      await tarefasRepository.create(novaTarefa.titulo, novaTarefa.materia, novaTarefa.dataPrazo, novaTarefa.horaPrazo, 'manual');
      setTexto('');
      setDataPrazoManual('');
      setHoraPrazoManual('');
      await carregarDados();
    } catch (e) {
      console.error('[Tarefas] Erro ao criar:', e);
    }
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

  async function adicionarMateria() {
    const nome = novaMateriaTexto.trim();
    if (!nome || materias.some((m) => m.nome === nome)) return;
    try {
      await materiasRepository.create(nome);
      await carregarDados();
      setNovaMateriaTexto('');
    } catch (e) {
      console.error('[Tarefas] Erro ao criar matéria:', e);
    }
  }

  async function concluirTarefa(id) {
    await tarefasRepository.concluir(id);
    await carregarDados();
    setPendenteConfirmar(null);
  }

  // Confirmar tarefa criada pelo LLM
  function confirmarTarefaCriada() {
    if (tarefaPendente) {
      tarefasRepository.create(
        tarefaPendente.titulo,
        tarefaPendente.materia || 'Pessoal',
        tarefaPendente.dataPrazo || null,
        null,
        'voz'
      ).then(() => {
        setModalVisivel(false);
        setTarefaPendente(null);
        carregarDados();
        setUltimoComando({ ok: true, frase: ultimaFrase, texto: `tarefa criada: "${tarefaPendente.titulo}"` });
      });
    }
  }

  // Editar tarefa antes de salvar
  function editarTarefa() {
    setModalVisivel(false);
    setTarefaPendente(null);
    if (tarefaPendente?.titulo) {
      setTexto(tarefaPendente.titulo);
      if (tarefaPendente.dataPrazo) setDataPrazoManual(tarefaPendente.dataPrazo);
      if (tarefaPendente.materia) setMateriaSelecionada(tarefaPendente.materia);
    }
  }

  // Cancelar criação da tarefa
  function cancelarTarefa() {
    setModalVisivel(false);
    setTarefaPendente(null);
    setUltimoComando({ ok: false, frase: ultimaFrase, texto: 'criação de tarefa cancelada' });
  }

  if (carregando) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontFamily: font.mono, color: colors.textPrimary }}>INICIALIZANDO...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={{ paddingTop: insets.top + spacing.lg, paddingHorizontal: spacing.md }}>
        <Text style={styles.header}>A_FAZER_</Text>
        <Text style={styles.dica} numberOfLines={2}>
          fale naturalmente, tipo "organizar tarefa até amanhã às 5" ou "terminei o relatório" — ou digite abaixo
        </Text>

        {!transcricao.modeloPronto && (
          <Text style={styles.gravandoTexto}>
            ● baixando modelo de transcrição... {Math.round((transcricao.progressoModelo || 0) * 100)}%
          </Text>
        )}

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
            style={[styles.botaoIcone, gravador.gravando && styles.botaoIconeAtivo]}
            onPress={alternarGravacao}
          >
            <Ionicons name={gravador.gravando ? 'stop' : 'mic'} size={20} color={gravador.gravando ? colors.textPrimary : colors.onAccent} />
          </TouchableOpacity>
        </View>

        {gravador.gravando && <Text style={styles.gravandoTexto}>● OUVINDO COMANDO... {formatarDuracao(gravador.tempoGravacao)}</Text>}

        {transcrevendo && <Text style={styles.processandoTexto}>● TRANSCREVENDO ÁUDIO (on-device)...</Text>}

        {interpretador.estaProcessando && <Text style={styles.processandoTexto}>● INTERPRETANDO COM IA...</Text>}

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
                key={m.id}
                onPress={() => setMateriaSelecionada(m.nome)}
                style={[styles.chipMateria, materiaSelecionada === m.nome && styles.chipMateriaAtivo]}
              >
                <Text style={[styles.chipMateriaText, materiaSelecionada === m.nome && styles.chipMateriaTextAtivo]} numberOfLines={1}>
                  {m.nome}
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
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ padding: spacing.md, paddingTop: spacing.sm }}
        renderItem={({ item }) => (
          <Card>
            <View style={styles.linha}>
              <View style={{ flex: 1 }}>
                <Text style={styles.titulo}>{item.titulo}</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.infoTexto}>criada {formatarData(item.criadaEm)}</Text>
                  {item.dataPrazo && (
                    <Text style={styles.infoTexto}>
                      prazo {formatarData(item.dataPrazo)}{item.horaPrazo ? ` ${item.horaPrazo}` : ''}
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

      <ModalConfirmacao
        visivel={modalVisivel}
        tarefa={tarefaPendente}
        onConfirmar={confirmarTarefaCriada}
        onEditar={editarTarefa}
        onCancelar={cancelarTarefa}
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
  processandoTexto: { fontSize: 11, fontFamily: font.mono, color: colors.textPrimary, marginTop: spacing.xs },
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