/**
 * 📐 Spacing System
 * Consistent spacing tokens following iOS HIG principles
 * Generous spacing for modern, breathable layouts
 */

export const Spacing = {
  // ─── Base Scale (4px grid) ───────────────────────────
  xs: 4,     // Tiny gaps
  sm: 8,     // Small spacing
  md: 12,    // Medium spacing
  lg: 16,    // Large spacing (standard padding)
  xl: 20,    // Extra large
  xxl: 24,   // Double extra large
  xxxl: 32,  // Triple extra large
  huge: 40,  // Huge spacing
  massive: 48, // Massive spacing

  // ─── Semantic Spacing ────────────────────────────────
  cardPadding: 16,
  screenPadding: 16,
  sectionSpacing: 24,
  listItemPadding: 16,
  inputPadding: 12,
  buttonPaddingVertical: 14,
  buttonPaddingHorizontal: 20,

  // ─── Safe Area Additions ─────────────────────────────
  safeAreaTop: 44,     // iOS status bar
  safeAreaBottom: 34,  // iOS home indicator
  tabBarHeight: 88,    // iOS tab bar with safe area
} as const;

export type SpacingKey = keyof typeof Spacing;
