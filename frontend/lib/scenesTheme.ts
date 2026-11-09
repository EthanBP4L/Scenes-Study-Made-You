
/**
 * SCENES shared visual foundation.
 *
 * The Zimmer screenshot is the visual reference.
 * These tokens are for shared UI elements across SCENES.
 *
 * Zimmer object positions, user customizations,
 * stickers, and GIFs remain independent.
 */

export const scenesTheme = {
  colors: {
    void: "#100C20",
    night: "#24183B",
    violet: "#50386D",
    electricPurple: "#8444E5",
    pink: "#E883CB",
    pearl: "#F4E9FF",
    mutedText: "#D5C4E9",
  },

  surfaces: {
    page:
      "radial-gradient(ellipse at 72% 18%, #6b4d8d 0%, #3a2959 38%, #18152f 72%, #0b1025 100%)",
    panel: "rgba(255, 240, 252, 0.12)",
    panelDark: "rgba(33, 25, 68, 0.72)",
    panelBorder: "rgba(230, 196, 255, 0.55)",
  },

  radius: {
    small: 12,
    control: 16,
    panel: 26,
    floatingEditor: 28,
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    section: 48,
  },

  typography: {
    body: "Arial, Helvetica, sans-serif",
    headingWeight: 800,
    bodyWeight: 400,
  },

  layout: {
    desktopReferenceWidth: 1200,
    desktopReferenceHeight: 800,
    pageMaxWidth: 1200,
    contentPadding: 24,
    floatingEditorWidth: 300,
    floatingEditorHeight: 400,
  },

  effects: {
    panelShadow: "0 18px 60px rgba(8, 5, 29, 0.34)",
    floatingShadow: "0 24px 90px rgba(13, 5, 36, 0.7)",
  },
} as const;

export type ScenesTheme = typeof scenesTheme;
