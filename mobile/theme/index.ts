/**
 * 🎨 Premium iOS Design System
 * Modular, scalable, and consistent design tokens
 * 
 * Usage:
 * import { Colors, Spacing, Radius, Typography, Shadows, Gradients } from '@/theme';
 */

export { Colors, type ColorKey } from './colors';
export { Spacing, type SpacingKey } from './spacing';
export { Radius, type RadiusKey } from './radius';
export { Typography, type TypographyKey } from './typography';
export { Shadows, type ShadowKey } from './shadows';
export { Gradients, GradientDirections, type GradientKey } from './gradients';

// ─── Status & Semantic Labels (Arabic) ───────────────────
export const StatusLabels: Record<string, string> = {
  ACTIVE: 'نشط',
  SOLD: 'مباع',
  DECEASED: 'نافق',
  QUARANTINE: 'حجر صحي',
} as const;

export const GenderLabels: Record<string, string> = {
  MALE: 'ذكر',
  FEMALE: 'أنثى',
} as const;

export const HealthTypeLabels: Record<string, string> = {
  VACCINATION: 'تطعيم',
  DEWORMING: 'تجريع',
  TREATMENT: 'علاج',
  CHECKUP: 'فحص',
  SURGERY: 'عملية',
} as const;

export const PaymentStatusLabels: Record<string, string> = {
  PENDING: 'معلق',
  PARTIAL: 'جزئي',
  PAID: 'مدفوع',
} as const;

// ─── Status Color Mapping ────────────────────────────────
import { Colors } from './colors';

export const StatusColors: Record<string, string> = {
  ACTIVE: Colors.statusActive,
  SOLD: Colors.statusSold,
  DECEASED: Colors.statusDeceased,
  QUARANTINE: Colors.statusQuarantine,
} as const;
