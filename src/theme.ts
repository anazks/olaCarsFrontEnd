/**
 * OLA CARS — Global Design Tokens
 * Single source of truth for all brand colors and design values.
 * Import this wherever you need raw color values (inline styles, canvas, SVG, etc.)
 * Tailwind classes are auto-generated from tailwind.config.js which reads these same values.
 */

export const colors = {
  /** PRIMARY BRAND COLOR — logo mark, CTAs, highlights, active states */
  brandLime: '#C8E600',

  /** Logo text, headlines on light backgrounds, icon fills */
  brandBlack: '#0A0A0A',

  /** Hero sections, sidebar, dark panels — dominant dark surface */
  darkBackground: '#111111',

  /** Cards on dark bg, secondary dark surface, table headers */
  darkCard: '#1C1C1C',

  /** Page bg for light-mode sections, card backgrounds */
  lightBackground: '#F5F7FA',

  /** Cards, modals, input fields, light sections */
  white: '#FFFFFF',

  /** Overdue payments, critical alerts, errors */
  alertRed: '#E74C3C',

  /** Pending approvals, moderate warnings */
  warningOrange: '#E67E22',

  /** Subtext, metadata, placeholders on light bg */
  textSecondary: '#6B7280',

  /** Dividers, input borders on light backgrounds */
  borderLight: '#E5E7EB',

  /** Dividers and borders on dark backgrounds */
  borderDark: '#2A2A2A',
} as const;

export type ColorKey = keyof typeof colors;

/** Gradient helpers */
export const gradients = {
  lime: `linear-gradient(135deg, ${colors.brandLime} 0%, #a8c100 100%)`,
  dark: `linear-gradient(135deg, ${colors.darkBackground} 0%, ${colors.darkCard} 100%)`,
  heroDark: `linear-gradient(135deg, ${colors.darkBackground} 0%, #1a1a2e 50%, #0d0d1a 100%)`,
} as const;
