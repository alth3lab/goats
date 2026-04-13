/**
 * ✍️ Typography System
 * iOS-style text hierarchy with SF Pro-inspired sizing
 * Includes tabular nums for consistent number display
 */

export const Typography = {
  // ─── Display Sizes (Large Titles) ────────────────────
  display: {
    fontSize: 34,
    fontWeight: '700' as const,
    lineHeight: 41,
    letterSpacing: -0.8,
  },

  // ─── Headers ─────────────────────────────────────────
  h1: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
    letterSpacing: -0.2,
  },
  h4: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  h5: {
    fontSize: 17,
    fontWeight: '600' as const,
    lineHeight: 22,
  },

  // ─── Body Text ───────────────────────────────────────
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodyBold: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  bodyLarge: {
    fontSize: 17,
    fontWeight: '400' as const,
    lineHeight: 25,
  },

  // ─── Captions & Small Text ───────────────────────────
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  captionBold: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
  small: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  smallBold: {
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 16,
  },
  tiny: {
    fontSize: 11,
    fontWeight: '400' as const,
    lineHeight: 14,
  },

  // ─── Special Modifiers ───────────────────────────────
  // For numeric displays — prevents digit-width jumping
  tabularNums: {
    fontVariant: ['tabular-nums' as const],
  },

  // iOS-style navigation title
  navTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    lineHeight: 22,
  },

  // iOS-style large title (for navigation headers)
  largeTitle: {
    fontSize: 34,
    fontWeight: '700' as const,
    lineHeight: 41,
    letterSpacing: -0.8,
  },
} as const;

export type TypographyKey = keyof typeof Typography;
