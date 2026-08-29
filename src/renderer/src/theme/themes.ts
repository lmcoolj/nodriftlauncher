import type { Theme } from './tokens'

/**
 * Built-in themes. To add a theme, implement the Theme interface and push it to
 * the `themes` array — the Settings tab picks it up automatically and the CSS
 * variable system applies it without any further wiring.
 *
 * Look: Minecraft GUI. Dark, flat solids, purple + blue accents. `outline` is
 * the hard near-black ring; `edgeHi`/`edgeLo` build the block bevel.
 */

// Shared structural values — the bevel edges and outline are constant across the
// dark themes, so each theme just swaps the palette + accent pair.
const OUTLINE = '#060410'
const EDGE_HI = 'rgba(255, 255, 255, 0.16)'
const EDGE_LO = 'rgba(0, 0, 0, 0.46)'

const PURPLE = { accent: '#7b4dd8', accentHover: '#a883f4', accentDeep: '#4f2f96' }
const BLUE = { accent2: '#3a5bd0', accent2Hover: '#7f9bf7', accent2Deep: '#26408f' }

export const nodriftPurple: Theme = {
  id: 'nodrift-purple',
  name: 'Amethyst',
  scheme: 'dark',
  tokens: {
    bg: '#0b0913',
    surface: '#17142a',
    surfaceRaised: '#211c3a',
    surfaceHover: '#2b2450',
    border: '#322a52',
    borderStrong: '#4a3f6e',
    outline: OUTLINE,
    edgeHi: EDGE_HI,
    edgeLo: EDGE_LO,
    text: '#ece9f6',
    textMuted: '#a49dc4',
    textDim: '#6f6796',
    accent: PURPLE.accent,
    accentHover: PURPLE.accentHover,
    accentDeep: PURPLE.accentDeep,
    accent2: BLUE.accent2,
    accent2Hover: BLUE.accent2Hover,
    accent2Deep: BLUE.accent2Deep,
    ready: '#57d497',
    danger: '#d9445f',
    shadow: 'rgba(0, 0, 0, 0.9)'
  }
}

export const nodriftBlue: Theme = {
  id: 'nodrift-blue',
  name: 'Lapis',
  scheme: 'dark',
  tokens: {
    bg: '#090b16',
    surface: '#141a2e',
    surfaceRaised: '#1c2440',
    surfaceHover: '#243052',
    border: '#2a3358',
    borderStrong: '#3c4a78',
    outline: OUTLINE,
    edgeHi: EDGE_HI,
    edgeLo: EDGE_LO,
    text: '#e9edf8',
    textMuted: '#9aa6c8',
    textDim: '#66718f',
    // Primary = blue, secondary = purple (swapped).
    accent: BLUE.accent2,
    accentHover: BLUE.accent2Hover,
    accentDeep: BLUE.accent2Deep,
    accent2: PURPLE.accent,
    accent2Hover: PURPLE.accentHover,
    accent2Deep: PURPLE.accentDeep,
    ready: '#57d497',
    danger: '#d9445f',
    shadow: 'rgba(0, 0, 0, 0.9)'
  }
}

export const themes: Theme[] = [nodriftPurple, nodriftBlue]

export const defaultThemeId = nodriftPurple.id
