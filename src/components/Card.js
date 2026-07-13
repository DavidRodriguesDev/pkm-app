import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius, font } from '../theme';

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

// tone controla só o PESO visual (contorno vs preenchido), nunca a cor —
// o app é estritamente preto e branco.
export function StatusBadge({ label, tone = 'outline' }) {
  const preenchido = tone === 'filled';
  return (
    <View style={[styles.badge, preenchido && styles.badgeFilled]}>
      <Text style={[styles.badgeText, preenchido && styles.badgeTextFilled]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
  },
  badgeFilled: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  badgeText: {
    fontFamily: font.mono,
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.textSecondary,
  },
  badgeTextFilled: {
    color: colors.onAccent,
    fontWeight: '700',
  },
});
