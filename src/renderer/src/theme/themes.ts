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

// A neutral dark base for the accent-swap themes below (Amethyst/Lapis keep their
// own tinted surfaces above). Only the accent pair changes per colour theme.
interface Accents {
  accent: string
  accentHover: string
  accentDeep: string
  accent2: string
  accent2Hover: string
  accent2Deep: string
}

function makeTheme(id: string, name: string, a: Accents): Theme {
  return {
    id,
    name,
    scheme: 'dark',
    tokens: {
      bg: '#0c0b11',
      surface: '#17151f',
      surfaceRaised: '#201d2b',
      surfaceHover: '#2a2638',
      border: '#2f2b3d',
      borderStrong: '#45405c',
      outline: OUTLINE,
      edgeHi: EDGE_HI,
      edgeLo: EDGE_LO,
      text: '#ece9f2',
      textMuted: '#a09bb0',
      textDim: '#6a6580',
      ...a,
      ready: '#57d497',
      danger: '#d9445f',
      shadow: 'rgba(0, 0, 0, 0.9)'
    }
  }
}

export const nodriftEmerald = makeTheme('nodrift-emerald', 'Emerald', {
  accent: '#3fb56b',
  accentHover: '#65d78d',
  accentDeep: '#227a44',
  accent2: '#3aa0d0',
  accent2Hover: '#6cc3ee',
  accent2Deep: '#23688f'
})

export const nodriftRedstone = makeTheme('nodrift-redstone', 'Redstone', {
  accent: '#d0413f',
  accentHover: '#ec6a68',
  accentDeep: '#8f2624',
  accent2: '#e0912f',
  accent2Hover: '#f2b45a',
  accent2Deep: '#9a5f1a'
})

export const themes: Theme[] = [nodriftPurple, nodriftBlue, nodriftEmerald, nodriftRedstone]

export const defaultThemeId = nodriftPurple.id
