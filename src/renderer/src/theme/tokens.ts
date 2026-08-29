/**
 * The design-token contract for a Nodrift Client theme.
 *
 * Every theme supplies the same set of tokens; the ThemeProvider maps each one
 * to a CSS custom property (`--nd-<name>`) on :root, and all styling reads from
 * those variables. Adding a theme means implementing this interface — no CSS
 * changes required.
 *
 * Look: authentic Minecraft GUI. Flat solid fills (purple + blue), sharp
 * corners, chunky bevelled edges built from `outline` + `edgeHi` + `edgeLo`.
 * No smooth gradients.
 */
export interface ThemeTokens {
  /** App background (window base). */
  bg: string
  /** Default panel/surface colour. */
  surface: string
  /** Raised surface (cards, inputs, controls). */
  surfaceRaised: string
  /** Hover/selected surface. */
  surfaceHover: string
  /** Subtle divider/border. */
  border: string
  /** Stronger border for emphasis. */
  borderStrong: string
  /** Hard near-black GUI outline that rings every bevelled block. */
  outline: string
  /** Bevel highlight (top-left inner edge). */
  edgeHi: string
  /** Bevel shadow (bottom-right inner edge). */
  edgeLo: string
  /** Primary text. */
  text: string
  /** Secondary/muted text. */
  textMuted: string
  /** Dimmest text (timestamps, hints). */
  textDim: string
  /** Primary accent — brand + actions. */
  accent: string
  /** Primary accent hover (lighter). */
  accentHover: string
  /** Primary accent deep (shadowed edge / pressed). */
  accentDeep: string
  /** Secondary accent — activity / info (progress, live states). */
  accent2: string
  /** Secondary accent hover. */
  accent2Hover: string
  /** Secondary accent deep. */
  accent2Deep: string
  /** Positive/status colour (signed-in, ready). */
  ready: string
  /** Danger colour (close button, destructive actions). */
  danger: string
  /** Window drop-shadow colour. */
  shadow: string
}

export interface Theme {
  id: string
  name: string
  scheme: 'dark' | 'light'
  tokens: ThemeTokens
}
