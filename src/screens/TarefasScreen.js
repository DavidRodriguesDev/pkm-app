import { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Card } from '../components/Card';
import { colors, spacing, radius, font } from '../theme';
import { tarefasRepository, materiasRepository, initDatabase } from '../repositories/tarefasRepository';
import { ModalConfirmacao } from '../components/ModalConfirmacao';
import { useAi } from '../ai/AiProvider';
import { useGravador } from '../hooks/useGravador';
import { pareceConcluirTudo, extrairIndicesOrdinaisDeConclusao } from '../ai/tools';

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function TarefasScreen() {
  const insets = useSafeAreaInsets();
  const [tarefas, setTarefas] = useState([]);
  const [materias, setMaterias] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // Abas e Exclusão
  const [abaAtiva, setAbaAtiva] = useState('pendentes'); // 'pendentes' | 'concluidas'
  const [selecionadasExcluir, setSelecionadasExcluir] = useState([]); // IDs selecionados

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

  const { transcricao, interpretador, interpretarComando, testarModeloSemTools } = useAi();
  const gravador = useGravador();
  const [transcrevendo, setTranscrevendo] = useState(false);
  const [ultimoComando, setUltimoComando] = useState(null);

  const [pendenteConfirmar, setPendenteConfirmar] = useState(null);
  const [ultimaFrase, setUltimaFrase] = useState('');

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

  async function carregarDados() {
    // Antes: tarefasRepository.list(false) só trazia as pendentes, então a aba
    // "Concluídas" nunca tinha o que mostrar. Agora list() sem argumento traz tudo,
    // e o filtro por aba é feito abaixo em `tarefasFiltradas`.
    const listaTarefas = await tarefasRepository.list();
    const listaMaterias = await materiasRepository.list();
    // Ordenar: recentes primeiro
    listaTarefas.sort((a, b) => b.id - a.id);
    setTarefas(listaTarefas);
    setMaterias(listaMaterias);
    if (listaMaterias.length > 0 && !materiaSelecionada) {
      setMateriaSelecionada(listaMaterias[0].nome);
    }
  }

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
        setTarefaPendente({
          titulo: res.titulo,
          materia: res.materia,
          dataPrazo: res.dataPrazo,
          horaPrazo: res.horaPrazo,
        });
        setModalVisivel(true);
      } else if (res.tipo === 'concluir' && res.tarefasIds) {
        // Concluindo múltiplas tarefas
        concluirVariasTarefas(res.tarefasIds);
      }
    }
  }, [interpretador.resultado, interpretador.erro, interpretador.estaProcessando, ultimaFrase]);

  async function concluirVariasTarefas(ids) {
    for (const id of ids) {
      await tarefasRepository.concluir(id);
    }
    await carregarDados();
    setUltimoComando({ ok: true, frase: ultimaFrase, texto: `${ids.length} tarefa(s) concluída(s)` });
  }

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

  // Comandos como "concluir todas as tarefas pendentes" / "terminei tudo" são resolvidos
  // aqui direto, sem passar pelo LLM: pedir pra um modelo pequeno enumerar manualmente
  // o título de cada tarefa aberta é frágil (foi o que causou o array vazio nos logs).
  async function concluirTodasPendentes(frase) {
    const pendentes = tarefas.filter((t) => !t.concluida);
    if (pendentes.length === 0) {
      setUltimoComando({ ok: false, frase, texto: 'nenhuma tarefa pendente pra concluir' });
      return;
    }
    for (const t of pendentes) {
      await tarefasRepository.concluir(t.id);
    }
    await carregarDados();
    setUltimoComando({ ok: true, frase, texto: `${pendentes.length} tarefa(s) concluída(s)` });
  }

  // Comandos tipo "a primeira tarefa foi concluída" / "concluir a última tarefa":
  // resolvidos localmente por posição na lista exibida (mais recente primeiro),
  // pelo mesmo motivo acima — contar posição não é algo confiável pra pedir a um
  // modelo desse tamanho.
  async function concluirPorOrdinais(frase, indices) {
    const pendentes = tarefas.filter((t) => !t.concluida);
    const alvos = indices.map((i) => pendentes[i]).filter(Boolean);
    if (alvos.length === 0) {
      setUltimoComando({ ok: false, frase, texto: 'não encontrei essa posição na lista de pendentes' });
      return;
    }
    for (const t of alvos) {
      await tarefasRepository.concluir(t.id);
    }
    await carregarDados();
    setUltimoComando({ ok: true, frase, texto: `concluída(s): ${alvos.map((t) => t.titulo).join(', ')}` });
  }

  function processarComandoDeVoz(fraseReconhecida) {
    setUltimaFrase(fraseReconhecida);

    if (pareceConcluirTudo(fraseReconhecida)) {
      concluirTodasPendentes(fraseReconhecida);
      return;
    }

    const totalPendentes = tarefas.filter((t) => !t.concluida).length;
    const indicesOrdinais = extrairIndicesOrdinaisDeConclusao(fraseReconhecida, totalPendentes);
    if (indicesOrdinais.length > 0) {
      concluirPorOrdinais(fraseReconhecida, indicesOrdinais);
      return;
    }

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
          setUltimoComando({ ok: false, frase: '', texto: 'não entendi nada, tenta de novo' });
        }
      } catch (e) {
        setUltimoComando({ ok: false, frase: '', texto: `erro ao transcrever: ${e.message}` });
      } finally {
        setTranscrevendo(false);
      }
    } else {
      try {
        await gravador.iniciar();
      } catch (e) {
        setUltimoComando({ ok: false, frase: '', texto: `erro ao iniciar: ${e.message}` });
      }
    }
  }

  async function adicionarTarefaManual() {
    if (!texto.trim()) return;
    try {
      await tarefasRepository.create(texto, materiaSelecionada, dataPrazoManual || null, horaPrazoManual || null, 'manual');
      setTexto('');
      setDataPrazoManual('');
      setHoraPrazoManual('');
      await carregarDados();
      setAbaAtiva('pendentes'); // Força ir pra aba pendentes
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

  async function concluirTarefaUI(id) {
    await tarefasRepository.concluir(id);
    await carregarDados();
    setPendenteConfirmar(null);
  }

  function confirmarTarefaCriada() {
    if (tarefaPendente) {
      tarefasRepository.create(
        tarefaPendente.titulo,
        tarefaPendente.materia || 'Pessoal',
        tarefaPendente.dataPrazo || null,
        tarefaPendente.horaPrazo || null,
        'voz'
      ).then(() => {
        setModalVisivel(false);
        setTarefaPendente(null);
        carregarDados();
        setAbaAtiva('pendentes');
        setUltimoComando({ ok: true, frase: ultimaFrase, texto: `tarefa criada: "${tarefaPendente.titulo}"` });
      });
    }
  }

  function editarTarefa() {
    setModalVisivel(false);
    setTarefaPendente(null);
    if (tarefaPendente?.titulo) {
      setTexto(tarefaPendente.titulo);
      if (tarefaPendente.dataPrazo) setDataPrazoManual(tarefaPendente.dataPrazo);
      if (tarefaPendente.horaPrazo) setHoraPrazoManual(tarefaPendente.horaPrazo);
      if (tarefaPendente.materia) setMateriaSelecionada(tarefaPendente.materia);
    }
  }

  function cancelarTarefa() {
    setModalVisivel(false);
    setTarefaPendente(null);
    setUltimoComando({ ok: false, frase: ultimaFrase, texto: 'criação cancelada' });
  }

  // ==== Lógica de Exclusão (Aba Concluídas) ====
  function toggleSelecaoExcluir(id) {
    if (selecionadasExcluir.includes(id)) {
      setSelecionadasExcluir(selecionadasExcluir.filter(i => i !== id));
    } else {
      setSelecionadasExcluir([...selecionadasExcluir, id]);
    }
  }

  function selecionarTodasConcluidas() {
    const concluidas = tarefas.filter(t => t.concluida);
    if (selecionadasExcluir.length === concluidas.length) {
      setSelecionadasExcluir([]); // Desmarca tudo
    } else {
      setSelecionadasExcluir(concluidas.map(t => t.id)); // Marca tudo
    }
  }

  async function excluirTarefasSelecionadas() {
    Alert.alert(
      "Excluir Tarefas",
      `Tem certeza que deseja excluir ${selecionadasExcluir.length} tarefa(s)?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            for (const id of selecionadasExcluir) {
              await tarefasRepository.excluir(id);
            }
            setSelecionadasExcluir([]);
            carregarDados();
          }
        }
      ]
    );
  }

  if (carregando) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontFamily: font.mono, color: colors.textPrimary }}>INICIALIZANDO...</Text>
      </View>
    );
  }

  // Filtragem das tarefas baseada na aba ativa
  const tarefasFiltradas = tarefas.filter(t => abaAtiva === 'pendentes' ? !t.concluida : t.concluida);

  return (
    <View style={styles.container}>
      <View style={{ paddingTop: insets.top + spacing.lg, paddingHorizontal: spacing.md }}>
        <Text style={styles.header}>A_FAZER_</Text>
        <Text style={styles.dica} numberOfLines={2}>
          fale naturalmente, ex: "organizar tarefa até amanhã" ou "já realizei o relatório"
        </Text>

        {!transcricao.modeloPronto && (
          <Text style={styles.gravandoTexto}>● baixando transcrição... {Math.round((transcricao.progressoModelo || 0) * 100)}%</Text>
        )}
        {!interpretador.modeloPronto && (
          <Text style={styles.gravandoTexto}>● baixando IA... {Math.round((interpretador.progressoModelo || 0) * 100)}%</Text>
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
        {transcrevendo && <Text style={styles.processandoTexto}>● TRANSCREVENDO ÁUDIO...</Text>}
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
            </View>
          </View>
        </View>

        <View style={styles.adicionarRow}>
          <TouchableOpacity style={styles.botaoAdicionar} onPress={adicionarTarefaManual}>
            <Ionicons name="add" size={20} color={colors.onAccent} />
          </TouchableOpacity>
        </View>

        {/* ABAS: PENDENTES / CONCLUÍDAS */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tabBtn, abaAtiva === 'pendentes' && styles.tabBtnAtiva]}
            onPress={() => setAbaAtiva('pendentes')}
          >
            <Text style={[styles.tabText, abaAtiva === 'pendentes' && styles.tabTextAtiva]}>Pendentes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, abaAtiva === 'concluidas' && styles.tabBtnAtiva]}
            onPress={() => { setAbaAtiva('concluidas'); setSelecionadasExcluir([]); }}
          >
            <Text style={[styles.tabText, abaAtiva === 'concluidas' && styles.tabTextAtiva]}>Concluídas</Text>
          </TouchableOpacity>
        </View>

        {abaAtiva === 'concluidas' && tarefasFiltradas.length > 0 && (
          <TouchableOpacity onPress={selecionarTodasConcluidas} style={{marginBottom: spacing.xs, alignSelf: 'flex-end'}}>
             <Text style={{color: colors.textSecondary, fontFamily: font.mono, fontSize: 11}}>
               {selecionadasExcluir.length === tarefasFiltradas.length ? 'Desmarcar Todas' : 'Selecionar Todas'}
             </Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={tarefasFiltradas}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ padding: spacing.md, paddingTop: 0, paddingBottom: 100 }}
        renderItem={({ item }) => (
          <Card style={abaAtiva === 'concluidas' ? styles.cardConcluida : null}>
            <View style={styles.linha}>

              {/* Checkbox de exclusão nas Concluídas */}
              {abaAtiva === 'concluidas' && (
                <TouchableOpacity onPress={() => toggleSelecaoExcluir(item.id)} style={{marginRight: spacing.md}}>
                  <Ionicons
                    name={selecionadasExcluir.includes(item.id) ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={selecionadasExcluir.includes(item.id) ? colors.textPrimary : colors.borderStrong}
                  />
                </TouchableOpacity>
              )}

              <View style={{ flex: 1 }}>
                <Text style={[styles.titulo, abaAtiva === 'concluidas' && styles.textoRiscado]}>{item.titulo}</Text>
                <View style={styles.infoRow}>
                  {item.dataPrazo && (
                    <Text style={styles.infoTexto}>
                      prazo {formatarData(item.dataPrazo)}{item.horaPrazo ? ` ${item.horaPrazo}` : ''}
                    </Text>
                  )}
                  <Text style={styles.materia}>[{item.materia}]</Text>
                </View>
              </View>

              {/* Botão de concluir nas Pendentes */}
              {abaAtiva === 'pendentes' && (
                <TouchableOpacity onPress={() => setPendenteConfirmar(item)}>
                  <Ionicons name="square-outline" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {pendenteConfirmar?.id === item.id && abaAtiva === 'pendentes' && (
              <View style={styles.confirmBox}>
                <Text style={styles.confirmTexto}>concluir "{item.titulo}"?</Text>
                <View style={styles.confirmBotoes}>
                  <TouchableOpacity style={styles.botaoConfirmar} onPress={() => concluirTarefaUI(item.id)}>
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
        ListEmptyComponent={
          <Text style={{textAlign: 'center', color: colors.textDim, fontFamily: font.mono, marginTop: spacing.xl}}>
            Nenhuma tarefa {abaAtiva}
          </Text>
        }
      />

      {/* FLOATING ACTION BAR PARA EXCLUSÃO */}
      {abaAtiva === 'concluidas' && selecionadasExcluir.length > 0 && (
        <View style={styles.floatingBar}>
          <Text style={styles.floatingText}>{selecionadasExcluir.length} selecionada(s)</Text>
          <TouchableOpacity style={styles.floatingBtn} onPress={excluirTarefasSelecionadas}>
            <Ionicons name="trash-outline" size={16} color={colors.onAccent} />
            <Text style={styles.floatingBtnText}>Excluir</Text>
          </TouchableOpacity>
        </View>
      )}

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
  inputDataContainer: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.sm, height: 34, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
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
  textoRiscado: { textDecorationLine: 'line-through', color: colors.textDim },
  cardConcluida: { opacity: 0.7 },
  infoTexto: { fontSize: 10, fontFamily: font.mono, color: colors.textDim },
  materia: { fontSize: 10, fontFamily: font.mono, color: colors.textSecondary, marginTop: 2 },
  confirmBox: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  confirmTexto: { fontSize: 12, fontFamily: font.mono, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm },
  confirmBotoes: { flexDirection: 'row', gap: spacing.sm },
  botaoConfirmar: { flex: 1, backgroundColor: colors.accent, borderRadius: radius.sm, paddingVertical: spacing.xs, alignItems: 'center' },
  botaoConfirmarTexto: { color: colors.onAccent, fontSize: 10, fontFamily: font.mono, fontWeight: '700' },
  botaoCancelar: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingVertical: spacing.xs, alignItems: 'center' },
  botaoCancelarTexto: { color: colors.textSecondary, fontSize: 10, fontFamily: font.mono },

  // Abas
  tabsContainer: { flexDirection: 'row', marginTop: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: spacing.md },
  tabBtn: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center' },
  tabBtnAtiva: { borderBottomWidth: 2, borderBottomColor: colors.textPrimary },
  tabText: { fontFamily: font.mono, fontSize: 12, color: colors.textDim },
  tabTextAtiva: { color: colors.textPrimary, fontWeight: '700' },

  // Barra de exclusão flutuante
  floatingBar: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  floatingText: { fontFamily: font.mono, fontSize: 13, color: colors.textPrimary, fontWeight: '700' },
  floatingBtn: { backgroundColor: '#d32f2f', flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.sm, gap: spacing.xs },
  floatingBtnText: { color: colors.onAccent, fontFamily: font.mono, fontSize: 11, fontWeight: '700' }
});