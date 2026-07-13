import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, font } from '../theme';

export default function GravacaoScreen({ route, navigation }) {
  const { tipo = 'nota', titulo, materia } = route.params ?? {};
  const insets = useSafeAreaInsets();
  const [gravando, setGravando] = useState(false);
  const [tempoGravacao, setTempoGravacao] = useState(0);
  const [textoTranscrito, setTextoTranscrito] = useState('');

  useEffect(() => {
    let intervalo;
    if (gravando) {
      // zera só ao COMEÇAR uma gravação — antes zerava também ao parar, o
      // que fazia o tempo "sumir" da tela assim que você parava de gravar.
      setTempoGravacao(0);
      intervalo = setInterval(() => {
        setTempoGravacao((t) => t + 1);
      }, 1000);
    }
    return () => clearInterval(intervalo);
  }, [gravando]);

  function formatarDuracao(segundos) {
    const min = Math.floor(segundos / 60);
    const sec = segundos % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }

  function formatarTextoParaGravacao() {
    const agora = new Date();
    const hora = String(agora.getHours()).padStart(2, '0');
    const min = String(agora.getMinutes()).padStart(2, '0');
    const textoBase = tipo === 'aula' ? `Aula ${titulo} - ${materia}\n\n` : `Nota: ${titulo}\n\n`;
    const textoGravado = `Neste trecho, falo sobre diversos assuntos importantes. A duração desta gravação é ${formatarDuracao(tempoGravacao)}. Vamos continuar falando sobre o tema principal e explorar diferentes perspectivas sobre este assunto que é relevante para o desenvolvimento do projeto. Importante lembrar dos pontos principais que foram discutidos neste momento.`;
    return textoBase + textoGravado + `\n\nGravado às ${hora}:${min}`;
  }

  useEffect(() => {
    if (!gravando && tempoGravacao > 0) {
      setTextoTranscrito(formatarTextoParaGravacao());
    }
  }, [gravando, tempoGravacao]);

  const ehAula = tipo === 'aula';

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <Text style={styles.header}>
        {ehAula ? 'AULAS' : 'NOTAS'}
        {titulo ? ` :: ${titulo}` : ' :: novo bloco'}
      </Text>
      {ehAula && materia && <Text style={styles.subheader}>[{materia}]</Text>}

      <ScrollView style={styles.transcricaoBox}>
        {tempoGravacao === 0 ? (
          <Text style={styles.transcricaoPlaceholder}>toque em gravar para começar</Text>
        ) : (
          <Text style={styles.transcricaoTexto}>{textoTranscrito}</Text>
        )}
      </ScrollView>

      <View style={styles.controles}>
        {ehAula && (
          <TouchableOpacity style={styles.botaoAnexo} onPress={() => {}}>
            <Ionicons name="image-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.botaoPausar} onPress={() => {}}>
          <Ionicons name="pause-outline" size={22} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.botaoRec} onPress={() => setGravando((g) => !g)}>
          <Ionicons name={gravando ? 'stop' : 'mic'} size={26} color={gravando ? colors.textPrimary : colors.onAccent} />
        </TouchableOpacity>

        {tempoGravacao > 0 && (
          <Text style={styles.duracao}>{formatarDuracao(tempoGravacao)}</Text>
        )}

        {ehAula && (
          <TouchableOpacity style={styles.botaoAnexo} onPress={() => {}}>
            <Ionicons name="document-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity style={styles.botaoFinalizar} onPress={() => navigation.goBack()}>
        <Text style={styles.botaoFinalizarTexto}>FINALIZAR BLOCO</Text>
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
  header: { fontSize: 12, fontFamily: font.mono, letterSpacing: 1, color: colors.textSecondary },
  subheader: { fontSize: 11, fontFamily: font.mono, color: colors.textDim, marginTop: 2 },
  transcricaoBox: { flex: 1, paddingVertical: spacing.xl },
  transcricaoPlaceholder: { fontSize: 14, fontFamily: font.mono, lineHeight: 24, color: colors.textDim, textAlign: 'center' },
  transcricaoTexto: { fontSize: 14, fontFamily: font.mono, lineHeight: 24, color: colors.textPrimary, textAlign: 'center' },
  controles: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: spacing.lg,
  },
  botaoAnexo: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  botaoPausar: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  botaoRec: {
    width: 60,
    height: 60,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  duracao: { fontSize: 13, fontFamily: font.mono, color: colors.textSecondary, fontWeight: '700' },
  botaoFinalizar: {
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  botaoFinalizarTexto: { color: colors.onAccent, fontWeight: '700', fontFamily: font.mono, fontSize: 12, letterSpacing: 0.5 },
});
