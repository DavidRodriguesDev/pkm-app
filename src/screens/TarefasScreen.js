import { useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../components/Card';
import { colors, spacing, radius } from '../theme';

const TAREFAS_MOCK = [
  { id: '1', titulo: 'Trabalho de cálculo', prazo: '20 jul', concluida: false },
  { id: '2', titulo: 'Pagar conta de luz', prazo: '15 jul', concluida: false },
];

export default function TarefasScreen() {
  const insets = useSafeAreaInsets();
  const [tarefas, setTarefas] = useState(TAREFAS_MOCK);
  const [texto, setTexto] = useState('');
  const [gravando, setGravando] = useState(false);
  const [pendenteConfirmar, setPendenteConfirmar] = useState(null);

  function alternarGravacao() {
    if (gravando) {
      // Aqui depois entra a transcrição real do whisper.cpp.
      // Por enquanto só simula preenchendo o campo de texto.
      setTexto('preciso fazer um trabalho até dia 20');
    }
    setGravando((g) => !g);
  }

  function adicionarTarefa() {
    if (!texto.trim()) return;
    // Aqui depois entra a chamada real: manda `texto` (digitado ou vindo
    // da transcrição) pro endpoint /extrair_tarefa, que devolve
    // {acao, titulo, prazo} via Ollama. Por enquanto cria direto.
    setTarefas((prev) => [
      ...prev,
      { id: String(Date.now()), titulo: texto, prazo: null, concluida: false },
    ]);
    setTexto('');
  }

  function concluirTarefa(id) {
    setTarefas((prev) =>
      prev.map((t) => (t.id === id ? { ...t, concluida: true } : t))
    );
    setPendenteConfirmar(null);
  }

  return (
    <View style={styles.container}>
      <View style={{ paddingTop: insets.top + spacing.lg, paddingHorizontal: spacing.md }}>
        <Text style={styles.header}>A fazeres</Text>

        {/* Duas formas de adicionar: digitando direto, ou por voz (preenche o campo) */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="digite ou grave uma tarefa"
            placeholderTextColor={colors.textSecondary}
            value={texto}
            onChangeText={setTexto}
            onSubmitEditing={adicionarTarefa}
          />
          <TouchableOpacity
            style={[styles.botaoIcone, gravando && styles.botaoIconeAtivo]}
            onPress={alternarGravacao}
          >
            <Ionicons name={gravando ? 'stop' : 'mic-outline'} size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.botaoIcone} onPress={adicionarTarefa}>
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {gravando && <Text style={styles.gravandoTexto}>Ouvindo...</Text>}
      </View>

      <FlatList
        data={tarefas.filter((t) => !t.concluida)}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.md, paddingTop: spacing.sm }}
        renderItem={({ item }) => (
          <Card>
            <View style={styles.linha}>
              <View>
                <Text style={styles.titulo}>{item.titulo}</Text>
                {item.prazo && <Text style={styles.prazo}>Prazo {item.prazo}</Text>}
              </View>
              <TouchableOpacity onPress={() => setPendenteConfirmar(item)}>
                <Ionicons name="checkbox-outline" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {pendenteConfirmar?.id === item.id && (
              <View style={styles.confirmBox}>
                <Text style={styles.confirmTexto}>Concluir "{item.titulo}"?</Text>
                <View style={styles.confirmBotoes}>
                  <TouchableOpacity
                    style={styles.botaoConfirmar}
                    onPress={() => concluirTarefa(item.id)}
                  >
                    <Text style={styles.botaoConfirmarTexto}>Confirmar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.botaoCancelar}
                    onPress={() => setPendenteConfirmar(null)}
                  >
                    <Text style={styles.botaoCancelarTexto}>Cancelar</Text>
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
  container: { flex: 1, backgroundColor: colors.surface },
  header: { fontSize: 18, fontWeight: '500', color: colors.textPrimary, marginBottom: spacing.md },
  inputRow: { flexDirection: 'row', gap: spacing.sm },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 44,
    color: colors.textPrimary,
  },
  botaoIcone: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoIconeAtivo: { backgroundColor: colors.danger },
  gravandoTexto: { fontSize: 12, color: colors.danger, marginTop: spacing.xs },
  linha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titulo: { fontSize: 15, fontWeight: '500', color: colors.textPrimary },
  prazo: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  confirmBox: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  confirmTexto: { fontSize: 13, fontWeight: '500', color: colors.textPrimary, marginBottom: spacing.sm },
  confirmBotoes: { flexDirection: 'row', gap: spacing.sm },
  botaoConfirmar: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  botaoConfirmarTexto: { color: '#fff', fontSize: 12, fontWeight: '500' },
  botaoCancelar: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  botaoCancelarTexto: { color: colors.textSecondary, fontSize: 12 },
});
