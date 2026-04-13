/**
 * 🎨 Color Palette
 * Premium iOS-style color system with soft, watery tones
 * Supports light/dark mode (extend with dark variants as needed)
 */

export const Colors = {
  // ─── Primary Brand (Aqua/Teal) ───────────────────────
  primary: '#2AB5A0',        // Main teal
  primaryDark: '#1E9A87',     // Darker shade
  primaryLight: '#48D4BD',    // Lighter tint
  primaryAccent: '#5FE0C8',   // Crystal aqua accent

  // ─── Secondary (Purple) ──────────────────────────────
  secondary: '#7C5CBF',
  secondaryDark: '#6347A8',
  secondaryLight: '#9B6FD6',

  // ─── Semantic Colors ─────────────────────────────────
  success: '#34C759',         // iOS green
  warning: '#E8913A',
  error: '#E05C5C',
  info: '#4A8FD6',

  // ─── Backgrounds (Soft & Muted) ──────────────────────
  background: '#F0F4F3',      // Mist white
  surface: '#FFFFFF',
  surfaceVariant: '#EBF5F3',  // Soft teal tint
  card: '#FFFFFF',
  glass: 'rgba(255, 255, 255, 0.8)',    // Glassmorphism
  glassBlur: 'rgba(255, 255, 255, 0.7)',

  // ─── Text Hierarchy ──────────────────────────────────
  text: '#1A2B2A',            // Primary text
  textSecondary: '#5A6E6C',   // Secondary text
  textLight: '#8A9E9C',       // Tertiary text
  textOnPrimary: '#FFFFFF',   // Text on colored backgrounds
  textMuted: '#B0C0BE',       // Disabled/muted text

  // ─── Borders & Dividers ──────────────────────────────
  border: '#D8E5E3',
  borderLight: '#E8F0EE',
  divider: '#E0EBE9',

  // ─── Gender Colors ───────────────────────────────────
  male: '#4A8FD6',
  female: '#D4839A',

  // ─── Status Colors ───────────────────────────────────
  statusActive: '#2AB5A0',
  statusSold: '#4A8FD6',
  statusDeceased: '#8A9E9C',
  statusQuarantine: '#E05C5C',

  // ─── Overlays ────────────────────────────────────────
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
  shadow: 'rgba(0, 0, 0, 0.1)',

  // ─── iOS System Colors (for native feel) ────────────
  systemBlue: '#007AFF',
  systemGreen: '#34C759',
  systemRed: '#FF3B30',
  systemGray: '#8E8E93',
  systemGray2: '#AEAEB2',
  systemGray3: '#C7C7CC',
  systemGray4: '#D1D1D6',
  systemGray5: '#E5E5EA',
  systemGray6: '#F2F2F7',
} as const;

export type ColorKey = keyof typeof Colors;
