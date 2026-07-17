import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { colors, spacing, radius, font } from '../theme';

export function ModalConfirmacao({ visivel, tarefa, onConfirmar, onCancelar, onEditar }) {
  if (!tarefa || !visivel) return null;

  return (
    <Modal visible={visivel} transparent animationType="slide">
      <View style={styles.fundo}>
        <View style={styles.caixa}>
          <Text style={styles.titulo}>&gt; CONFIRMAR TAREFA</Text>

          <View style={styles.campos}>
            <View style={styles.campo}>
              <Text style={styles.rotulo}>Título</Text>
              <Text style={styles.valor}>{tarefa.titulo}</Text>
            </View>

            {tarefa.materia && (
              <View style={styles.campo}>
                <Text style={styles.rotulo}>Matéria</Text>
                <Text style={styles.valor}>{tarefa.materia}</Text>
              </View>
            )}

            {(tarefa.dataPrazo || tarefa.horaPrazo) && (
              <View style={styles.campo}>
                <Text style={styles.rotulo}>Prazo</Text>
                <Text style={styles.valor}>
                  {tarefa.dataPrazo || ''} {tarefa.horaPrazo || ''}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.botoes}>
            <TouchableOpacity style={styles.botao} onPress={onConfirmar}>
              <Text style={styles.botaoTexto}>CONFIRMAR</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.botao} onPress={onEditar}>
              <Text style={styles.botaoTexto}>EDITAR</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.botaoCancelar} onPress={onCancelar}>
              <Text style={styles.botaoCancelarTexto}>CANCELAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fundo: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  caixa: {
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    paddingBottom: spacing.lg + 20,
  },
  titulo: {
    fontSize: 14,
    fontFamily: font.mono,
    fontWeight: '700',
    letterSpacing: 1,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  campos: {
    marginBottom: spacing.lg,
  },
  campo: {
    marginBottom: spacing.sm,
  },
  rotulo: {
    fontSize: 10,
    fontFamily: font.mono,
    color: colors.textDim,
    marginBottom: 2,
  },
  valor: {
    fontSize: 13,
    fontFamily: font.mono,
    color: colors.textPrimary,
  },
  botoes: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  botao: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  botaoTexto: {
    color: colors.onAccent,
    fontSize: 11,
    fontFamily: font.mono,
    fontWeight: '700',
  },
  botaoCancelar: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  botaoCancelarTexto: {
    color: colors.textSecondary,
    fontSize: 11,
    fontFamily: font.mono,
  },
});
