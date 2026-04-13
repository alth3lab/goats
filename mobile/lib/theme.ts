/**
 * 🎨 Theme System (Backward Compatibility)
 * Re-exports the modular design system from /theme
 * 
 * For new code, prefer importing directly from '@/theme'
 * This file maintains compatibility with existing imports
 */

// RTL is configured in app/_layout.tsx

// First import Colors to use in this file
import { Colors as ThemeColors } from '@/theme';

// Then re-export everything
export {
  Colors,
  Spacing,
  Radius,
  Typography,
  Shadows,
  Gradients,
  GradientDirections,
  StatusLabels,
  GenderLabels,
  HealthTypeLabels,
  PaymentStatusLabels,
  StatusColors,
  type ColorKey,
  type SpacingKey,
  type RadiusKey,
  type TypographyKey,
  type ShadowKey,
  type GradientKey,
} from '@/theme';


// ─── Breeding Status Labels ──────────────────────────────
export const PregnancyStatusLabels: Record<string, string> = {
  MATED: 'تم التلقيح',
  PREGNANT: 'حامل',
  DELIVERED: 'ولدت',
  FAILED: 'فشل',
};

export const PregnancyStatusColors: Record<string, string> = {
  MATED: ThemeColors.info,
  PREGNANT: ThemeColors.female,
  DELIVERED: ThemeColors.success,
  FAILED: ThemeColors.error,
};

// ─── Expense Category Labels ─────────────────────────────
export const ExpenseCategoryLabels: Record<string, string> = {
  FEED: 'أعلاف',
  MEDICINE: 'أدوية',
  VETERINARY: 'بيطري',
  EQUIPMENT: 'معدات',
  LABOR: 'عمالة',
  UTILITIES: 'خدمات',
  MAINTENANCE: 'صيانة',
  OTHER: 'أخرى',
};

// ─── Event Type Labels ───────────────────────────────────
export const EventTypeLabels: Record<string, string> = {
  BIRTH: 'ولادة',
  VACCINATION: 'تطعيم',
  DEWORMING: 'تجريع',
  CHECKUP: 'فحص',
  BREEDING: 'تلقيح',
  WEANING: 'فطام',
  SALE: 'بيع',
  PURCHASE: 'شراء',
  MAINTENANCE: 'صيانة',
  OTHER: 'أخرى',
};
