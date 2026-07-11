import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '../theme';

// Badge de status colorido (Processado, Aguardando sincronização, etc)
export function StatusBadge({ label, tone = 'warning' }) {
  const tones = {
    warning: { bg: colors.warningBg, text: colors.warning },
    success: { bg: colors.successBg, text: colors.success },
    accent: { bg: colors.accentBg, text: colors.accent },
  };
  const t = tones[tone] || tones.warning;

  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      <Text style={[styles.badgeText, { color: t.text }]}>{label}</Text>
    </View>
  );
}

// Card genérico com título, subtítulo opcional e badges
export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
