import { Platform } from 'react-native';

// -----------------------------------------------------------------------
// Tema monocromático — preto e branco, sem cores, estilo dashboard de
// terminal (btop/htop). Diferenças de estado usam peso visual (contorno vs
// preenchido/inverso), não matiz.
// -----------------------------------------------------------------------

export const colors = {
  background: '#000000', // fundo geral do app
  surface: '#0d0d0d', // inputs, modais, elementos "elevados"
  surfaceAlt: '#161616', // hover/pressed states

  border: '#2c2c2c', // linhas/bordas padrão
  borderStrong: '#555555', // bordas em foco/selecionadas

  textPrimary: '#f2f2f2',
  textSecondary: '#8a8a8a',
  textDim: '#4d4d4d',

  // "accent" = branco puro, usado em vídeo-inverso (fundo branco, texto preto)
  accent: '#ffffff',
  accentBg: '#ffffff',
  onAccent: '#000000',

  // sem paleta de cor — todos os "tons" viram variações de peso/contraste
  danger: '#ffffff',
  dangerBg: '#ffffff',
  success: '#ffffff',
  successBg: '#ffffff',
  warning: '#e8e8e8',
  warningBg: '#1a1a1a',
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

// cantos quase retos — estética de terminal, nada de bordas muito arredondadas
export const radius = { sm: 2, md: 3, full: 999 };

// Fonte monoespaçada do sistema — funciona sem instalar nada extra.
// Quer trocar por uma fonte real tipo JetBrains Mono? Veja o comentário
// no fim deste arquivo com o passo a passo.
export const font = {
  mono: Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' }),
  monoBold: Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' }),
};

export const type = {
  label: {
    fontFamily: font.mono,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.textSecondary,
  },
  title: {
    fontFamily: font.mono,
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  body: {
    fontFamily: font.mono,
    fontSize: 13,
    color: colors.textPrimary,
  },
  bodySecondary: {
    fontFamily: font.mono,
    fontSize: 12,
    color: colors.textSecondary,
  },
};