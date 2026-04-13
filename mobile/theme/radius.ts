/**
 * 🔘 Border Radius System
 * Modern iOS-style rounded corners
 * From subtle rounding to pill shapes
 */

export const Radius = {
  // ─── Size Scale ──────────────────────────────────────
  xs: 4,     // Subtle rounding
  sm: 8,     // Small corners
  md: 12,    // Medium rounding (cards)
  lg: 16,    // Large rounding (containers)
  xl: 20,    // Extra large
  xxl: 24,   // Double extra large
  
  // ─── Semantic Radius ─────────────────────────────────
  button: 12,         // Standard button
  buttonLarge: 16,    // Large button
  card: 16,           // Card corners
  input: 12,          // Input field
  modal: 20,          // Modal/Sheet corners
  full: 999,          // Fully rounded (backward compat - same as pill)
  pill: 999,          // Fully rounded (pill shape)
  circle: 9999,       // Perfect circle
} as const;

export type RadiusKey = keyof typeof Radius;
