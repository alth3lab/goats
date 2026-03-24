// RTL is configured in app/_layout.tsx

// ─── Color Palette (matching web theme) ──────────────────
export const Colors = {
  primary: '#4F7A57',
  primaryDark: '#3d6045',
  primaryLight: '#6b9a73',
  secondary: '#2F3A45',
  success: '#5E9E72',
  warning: '#C98A3D',
  error: '#C96A6A',
  info: '#5B8FB9',

  background: '#F6F5F1',
  surface: '#FFFFFF',
  surfaceVariant: '#F0EDE6',
  card: '#FFFFFF',

  text: '#223028',
  textSecondary: '#5F6B64',
  textLight: '#8A9490',
  textOnPrimary: '#FFFFFF',

  border: '#E0DDD6',
  borderLight: '#EDEBE6',
  divider: '#E8E5DF',

  male: '#5B8FB9',
  female: '#D4839A',

  statusActive: '#5E9E72',
  statusSold: '#5B8FB9',
  statusDeceased: '#8A9490',
  statusQuarantine: '#C96A6A',

  overlay: 'rgba(0,0,0,0.5)',
  shadow: 'rgba(0,0,0,0.08)',
} as const;

// ─── Spacing ─────────────────────────────────────────────
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

// ─── Border Radius ───────────────────────────────────────
export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;

// ─── Typography ──────────────────────────────────────────
export const Typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, lineHeight: 36 },
  h2: { fontSize: 24, fontWeight: '700' as const, lineHeight: 32 },
  h3: { fontSize: 20, fontWeight: '600' as const, lineHeight: 28 },
  h4: { fontSize: 18, fontWeight: '600' as const, lineHeight: 24 },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  bodyBold: { fontSize: 16, fontWeight: '600' as const, lineHeight: 24 },
  caption: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  captionBold: { fontSize: 14, fontWeight: '600' as const, lineHeight: 20 },
  small: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
  smallBold: { fontSize: 12, fontWeight: '600' as const, lineHeight: 16 },
} as const;

// ─── Shadows ─────────────────────────────────────────────
export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
} as const;

// ─── Status Labels (Arabic) ─────────────────────────────
export const StatusLabels: Record<string, string> = {
  ACTIVE: 'نشط',
  SOLD: 'مباع',
  DECEASED: 'نافق',
  QUARANTINE: 'حجر صحي',
};

export const GenderLabels: Record<string, string> = {
  MALE: 'ذكر',
  FEMALE: 'أنثى',
};

export const HealthTypeLabels: Record<string, string> = {
  VACCINATION: 'تطعيم',
  DEWORMING: 'تجريع',
  TREATMENT: 'علاج',
  CHECKUP: 'فحص',
  SURGERY: 'عملية',
};

export const PaymentStatusLabels: Record<string, string> = {
  PENDING: 'معلق',
  PARTIAL: 'جزئي',
  PAID: 'مدفوع',
};

export const StatusColors: Record<string, string> = {
  ACTIVE: Colors.statusActive,
  SOLD: Colors.statusSold,
  DECEASED: Colors.statusDeceased,
  QUARANTINE: Colors.statusQuarantine,
};
