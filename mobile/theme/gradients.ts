/**
 * 🌊 Gradient System
 * Soft, watery gradients for premium iOS feel
 * Liquid, glass-like color transitions
 */

export const Gradients = {
  // ─── Primary Gradients (Aqua/Teal) ───────────────────
  teal: ['#2AB5A0', '#1E9A87', '#17847A'] as const,
  tealLight: ['#5FE0C8', '#48D4BD', '#2AB5A0'] as const,
  aqua: ['#48D4BD', '#2AB5A0', '#1E9A87'] as const,
  crystalTeal: ['#A8F0E6', '#5FE0C8', '#2AB5A0'] as const,

  // ─── Secondary Gradients (Purple) ────────────────────
  purple: ['#9B6FD6', '#7C5CBF', '#6347A8'] as const,
  purpleLight: ['#B89EE8', '#9B6FD6', '#7C5CBF'] as const,

  // ─── Accent Gradients ────────────────────────────────
  blue: ['#4A8FD6', '#3A7BC8', '#2D68B5'] as const,
  blueLight: ['#6AA8E8', '#4A8FD6', '#3A7BC8'] as const,
  
  orange: ['#F5A623', '#E8913A', '#D67D2D'] as const,
  orangeLight: ['#FFB84D', '#F5A623', '#E8913A'] as const,

  green: ['#48D4BD', '#2AB5A0', '#1E9A87'] as const,
  greenSuccess: ['#5FE070', '#34C759', '#28A745'] as const,

  red: ['#F07070', '#E05C5C', '#CC4848'] as const,
  redLight: ['#FF8A8A', '#F07070', '#E05C5C'] as const,

  // ─── Neutral Gradients ───────────────────────────────
  dark: ['#3A5252', '#2A3E3E', '#1E2F2F'] as const,
  gray: ['#8A9E9C', '#5A6E6C', '#3A4E4C'] as const,
  light: ['#FFFFFF', '#F0F4F3', '#EBF5F3'] as const,

  // ─── Glass/Frosted Gradients ─────────────────────────
  glass: [
    'rgba(255, 255, 255, 0.9)',
    'rgba(255, 255, 255, 0.7)',
    'rgba(255, 255, 255, 0.5)',
  ] as const,
  
  glassAqua: [
    'rgba(42, 181, 160, 0.15)',
    'rgba(42, 181, 160, 0.08)',
    'rgba(42, 181, 160, 0.03)',
  ] as const,

  glassPurple: [
    'rgba(124, 92, 191, 0.15)',
    'rgba(124, 92, 191, 0.08)',
    'rgba(124, 92, 191, 0.03)',
  ] as const,

  // ─── Subtle Background Gradients ─────────────────────
  mistWhite: ['#FAFCFC', '#F0F4F3', '#EBF5F3'] as const,
  softTeal: ['#F5FFFE', '#EBF5F3', '#E0F0EE'] as const,
  
  // ─── Vibrant Overlay Gradients (for cards) ───────────
  sunset: ['#FF9A76', '#FF6B9D', '#C44569'] as const,
  ocean: ['#4FACFE', '#00F2FE', '#43E695'] as const,
  lavender: ['#C471F5', '#FA71CD', '#FF6B9D'] as const,
  mint: ['#A8EDEA', '#48D4BD', '#2AB5A0'] as const,

  // ─── Premium Card Gradients ──────────────────────────
  heroTeal: ['#5FE0C8', '#2AB5A0', '#1E9A87', '#17847A'] as const,
  heroPurple: ['#B89EE8', '#9B6FD6', '#7C5CBF', '#6347A8'] as const,
  heroBlue: ['#6AA8E8', '#4A8FD6', '#3A7BC8', '#2D68B5'] as const,
} as const;

export type GradientKey = keyof typeof Gradients;

/**
 * Gradient direction helpers for LinearGradient
 */
export const GradientDirections = {
  vertical: { start: { x: 0.5, y: 0 }, end: { x: 0.5, y: 1 } },
  horizontal: { start: { x: 0, y: 0.5 }, end: { x: 1, y: 0.5 } },
  diagonal: { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
  diagonalReverse: { start: { x: 1, y: 0 }, end: { x: 0, y: 1 } },
  radial: { start: { x: 0.5, y: 0.5 }, end: { x: 1, y: 1 } },
} as const;
