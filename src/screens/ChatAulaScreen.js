import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, font } from '../theme';

export default function ChatAulaScreen({ route, navigation }) {
  const { aula } = route.params;
  const [mensagem, setMensagem] = useState('');
  const [messages, setMessages] = useState(aula.messages || []);
  const [modoGravacao, setModoGravacao] = useState(false);
  const scrollViewRef = useRef(null);

  useEffect(() => {
    if (messages.length > 0 && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  function adicionarMensagemTexto() {
    if (!mensagem.trim()) return;
    const novaMsg = {
      id: String(Date.now()),
      tipo: 'text',
      texto: mensagem.trim(),
      remetente: 'eu',
      hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, novaMsg]);
    setMensagem('');
  }

  function confirmarGravacao() {
    if (mensagem.trim()) {
      adicionarMensagemTexto();
      setModoGravacao(false);
    } else {
      setModoGravacao(false);
    }
  }

  function cancelarGravacao() {
    setModoGravacao(false);
    setMensagem('');
  }

  function escolherFoto() {
    Alert.alert('Escolher foto', 'Funcionalidade de galeria não disponível sem dependências extras. Use Expo Image Picker ou configure picker nativo.', [
      { text: 'OK', style: 'cancel' },
    ]);
  }

  function escolherArquivo() {
    Alert.alert('Escolher arquivo', 'Funcionalidade de documento não disponível sem dependências extras. Use Expo Document Picker ou configure picker nativo.', [
      { text: 'OK', style: 'cancel' },
    ]);
  }

  function renderMensagem(item) {
    const eEu = item.remetente === 'eu';

    if (item.tipo === 'text') {
      return (
        <View style={[styles.msgContainer, eEu ? styles.msgEu : styles.msgOutro]}>
          <View style={[styles.msgCaixa, eEu ? styles.msgCaixaEu : styles.msgCaixaOutro]}>
            <Text style={eEu ? styles.msgTexto : styles.msgOutroTexto}>{item.texto}</Text>
          </View>
          <Text style={eEu ? styles.msgHora : styles.msgOutroHora}>{item.hora}</Text>
        </View>
      );
    }

    if (item.tipo === 'image') {
      return (
        <View style={[styles.msgContainer, eEu ? styles.msgEu : styles.msgOutro]}>
          <View style={[styles.msgCaixa, eEu ? styles.msgCaixaEu : styles.msgCaixaOutro]}>
            <Image source={{ uri: item.uri }} style={styles.imgAnexo} resizeMode="cover" />
            <Text style={eEu ? styles.msgHora : styles.msgOutroHora}>{item.hora}</Text>
          </View>
        </View>
      );
    }

    if (item.tipo === 'document') {
      return (
        <View style={[styles.msgContainer, eEu ? styles.msgEu : styles.msgOutro]}>
          <View style={[styles.msgCaixa, eEu ? styles.msgCaixaEu : styles.msgCaixaOutro]}>
            <View style={styles.docAnexo}>
              <Ionicons name="document-text-outline" size={22} color={eEu ? colors.onAccent : colors.textPrimary} />
              <Text style={eEu ? styles.msgTexto : styles.msgOutroTexto}>{item.nome}</Text>
            </View>
            <Text style={[eEu ? styles.msgHora : styles.msgOutroHora, { marginTop: 4 }]}>{item.hora}</Text>
          </View>
        </View>
      );
    }

    return null;
  }

  const podeEnviar = mensagem.trim().length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.voltaBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.tituloAula}>{aula.titulo}</Text>
          <Text style={styles.materiaAula}>[{aula.materia}]</Text>
        </View>
        <View style={styles.voltaBtn} />
      </View>

      <FlatList
        ref={scrollViewRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 160 }}
        renderItem={({ item }) => renderMensagem(item)}
        ListEmptyComponent={
          <View style={styles.vazioContainer}>
            <Ionicons name="chatbubbles-outline" size={56} color={colors.textDim} />
            <Text style={styles.vazioTexto}>inicie a conversa sobre {aula.titulo}</Text>
          </View>
        }
      />

      <View style={styles.controlsArea}>
        {modoGravacao && (
          <View style={styles.gravacaoArea}>
            <View style={styles.gravacaoFundo}>
              <View style={styles.gravacaoBarra}>
                {[...Array(10)].map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.gravacaoBarraPonto,
                      { height: Math.random() * 20 + 10 },
                    ]}
                  />
                ))}
              </View>
              <Text style={styles.gravacaoTexto}>gravando... fale algo</Text>
            </View>

            <TouchableOpacity style={styles.botaoGravar} onPress={confirmarGravacao}>
              <Ionicons name="mic" size={28} color={colors.onAccent} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.botaoGravar, styles.botaoParar]}
              onPress={cancelarGravacao}
            >
              <Ionicons name="stop" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        )}

        {!modoGravacao && (
          <View style={styles.inputArea}>
            <View style={styles.anexosRow}>
              <TouchableOpacity style={styles.botaoAnexo} onPress={escolherFoto}>
                <Ionicons name="image-outline" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.botaoAnexo} onPress={escolherArquivo}>
                <Ionicons name="document-text-outline" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.inputMsg}
              placeholder="digite ou grave"
              placeholderTextColor={colors.textDim}
              value={mensagem}
              onChangeText={setMensagem}
              onSubmitEditing={adicionarMensagemTexto}
              multiline
              maxLength={500}
            />

            <TouchableOpacity
              style={[styles.botaoEnviar, podeEnviar && styles.botaoEnviarAtivo]}
              onPress={adicionarMensagemTexto}
            >
              <Ionicons name="send" size={18} color={podeEnviar ? colors.onAccent : colors.textDim} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.botaoMic, !podeEnviar && styles.botaoMicAtivo]}
              onPress={() => setModoGravacao(true)}
            >
              {/* aceso (branco) quando ainda não há texto, apagado quando já tem algo pra enviar */}
              <Ionicons name="mic-outline" size={22} color={!podeEnviar ? colors.textPrimary : colors.textDim} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingTop: 40,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  voltaBtn: { width: 36, marginRight: spacing.sm },
  headerInfo: { flex: 1 },
  tituloAula: { fontSize: 14, fontFamily: font.mono, fontWeight: '700', color: colors.textPrimary },
  materiaAula: { fontSize: 11, fontFamily: font.mono, color: colors.textDim, marginTop: 2 },
  msgContainer: { flexDirection: 'column', marginBottom: spacing.sm },
  msgEu: { alignItems: 'flex-end' },
  msgOutro: { alignItems: 'flex-start' },
  msgCaixa: {
    maxWidth: '80%',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
  },
  msgCaixaEu: {
    backgroundColor: colors.accent,
  },
  msgCaixaOutro: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  msgTexto: { fontSize: 13, fontFamily: font.mono, color: colors.onAccent },
  msgOutroTexto: { fontSize: 13, fontFamily: font.mono, color: colors.textPrimary },
  msgHora: { fontSize: 9, fontFamily: font.mono, color: colors.textDim, marginTop: 4, alignSelf: 'flex-end' },
  msgOutroHora: { fontSize: 9, fontFamily: font.mono, color: colors.textDim, marginTop: 4, alignSelf: 'flex-start' },
  imgAnexo: { width: 150, height: 150, borderRadius: radius.sm, marginBottom: 4 },
  docAnexo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  vazioContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl },
  vazioTexto: { fontSize: 13, fontFamily: font.mono, color: colors.textDim, marginTop: spacing.sm },
  controlsArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  gravacaoArea: {
    padding: spacing.md,
    alignItems: 'center',
  },
  gravacaoFundo: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    borderRadius: radius.full,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  gravacaoBarra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.sm,
  },
  gravacaoBarraPonto: {
    width: 5,
    backgroundColor: colors.textPrimary,
    borderRadius: radius.full,
  },
  gravacaoTexto: { fontSize: 13, fontFamily: font.mono, color: colors.textPrimary },
  botaoGravar: {
    width: 60,
    height: 60,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  botaoParar: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.md,
  },
  anexosRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end' },
  botaoAnexo: { padding: spacing.xs },
  inputMsg: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 42,
    maxHeight: 100,
    fontSize: 13,
    fontFamily: font.mono,
    color: colors.textPrimary,
  },
  botaoEnviar: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoEnviarAtivo: { backgroundColor: colors.accent, borderColor: colors.accent },
  botaoMic: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  botaoMicAtivo: { borderColor: colors.borderStrong },
});
