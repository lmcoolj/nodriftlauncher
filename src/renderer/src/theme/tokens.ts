/**
 * The design-token contract for a NodriftLauncher theme.
 *
 * Every theme supplies the same set of tokens; the ThemeProvider maps each one
 * to a CSS custom property (`--nd-<kebab-name>`) on :root, and all styling reads
 * from those variables. Adding a new theme therefore means implementing this
 * interface — no CSS changes required.
 *
 * Palette rule (per design): only blue, purple, white, black and grey. NO
 * GRADIENTS anywhere. Keep token values flat colours only.
 */
export interface ThemeTokens {
  /** App background (window base). */
  bg: string
  /** Default panel/surface colour. */
  surface: string
  /** Raised surface (cards, inputs, controls). */
  surfaceRaised: string
  /** Subtle divider/border. */
  border: string
  /** Stronger border for emphasis/focus edges. */
  borderStrong: string
  /** Primary text. */
  text: string
  /** Secondary/muted text. */
  textMuted: string
  /** Primary accent (blue). */
  accent: string
  /** Primary accent hover. */
  accentHover: string
  /** Secondary accent (purple). */
  accent2: string
  /** Secondary accent hover. */
  accent2Hover: string
  /** Tab hover background. */
  tabHover: string
  /** Active tab background. */
  tabActiveBg: string
  /** Active tab text. */
  tabActiveText: string
  /** Window-control hover (generic). */
  controlHover: string
  /** Minimize button hover. */
  controlMinHover: string
  /** Close button hover. */
  controlCloseHover: string
  /** Drop shadow colour. */
  shadow: string
}

export interface Theme {
  id: string
  name: string
  scheme: 'dark' | 'light'
  tokens: ThemeTokens
}
