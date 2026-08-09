import type { Theme } from './tokens'

/**
 * Built-in themes. To add a theme, implement the Theme interface and push it to
 * the `themes` array — the Settings tab picks it up automatically and the CSS
 * variable system applies it without any further wiring.
 *
 * Palette is restricted to blue / purple / white / black / grey, flat colours,
 * no gradients.
 */

export const nodriftDark: Theme = {
  id: 'nodrift-dark',
  name: 'Nodrift Dark',
  scheme: 'dark',
  tokens: {
    bg: '#0e0f13',
    surface: '#16171d',
    surfaceRaised: '#1e2029',
    border: '#2a2d3a',
    borderStrong: '#3a3e50',
    text: '#f2f3f7',
    textMuted: '#9aa0b0',
    accent: '#4f7bff',
    accentHover: '#6b90ff',
    accent2: '#8b5cf6',
    accent2Hover: '#a17bff',
    tabHover: 'rgba(79, 123, 255, 0.14)',
    tabActiveBg: 'rgba(79, 123, 255, 0.20)',
    tabActiveText: '#ffffff',
    controlHover: 'rgba(255, 255, 255, 0.10)',
    controlMinHover: 'rgba(79, 123, 255, 0.30)',
    controlCloseHover: '#e5484d',
    shadow: 'rgba(0, 0, 0, 0.55)'
  }
}

export const nodriftPurple: Theme = {
  id: 'nodrift-purple',
  name: 'Nodrift Purple',
  scheme: 'dark',
  tokens: {
    bg: '#100d18',
    surface: '#181322',
    surfaceRaised: '#221a30',
    border: '#332543',
    borderStrong: '#4a3560',
    text: '#f4f1fb',
    textMuted: '#a99bc0',
    accent: '#8b5cf6',
    accentHover: '#a17bff',
    accent2: '#4f7bff',
    accent2Hover: '#6b90ff',
    tabHover: 'rgba(139, 92, 246, 0.16)',
    tabActiveBg: 'rgba(139, 92, 246, 0.24)',
    tabActiveText: '#ffffff',
    controlHover: 'rgba(255, 255, 255, 0.10)',
    controlMinHover: 'rgba(139, 92, 246, 0.32)',
    controlCloseHover: '#e5484d',
    shadow: 'rgba(0, 0, 0, 0.6)'
  }
}

export const nodriftLight: Theme = {
  id: 'nodrift-light',
  name: 'Nodrift Light',
  scheme: 'light',
  tokens: {
    bg: '#f4f5f8',
    surface: '#ffffff',
    surfaceRaised: '#eceef4',
    border: '#d5d8e2',
    borderStrong: '#b9bece',
    text: '#14151a',
    textMuted: '#5b6070',
    accent: '#3b6bff',
    accentHover: '#2b57e0',
    accent2: '#7c3aed',
    accent2Hover: '#6a2bd6',
    tabHover: 'rgba(59, 107, 255, 0.12)',
    tabActiveBg: 'rgba(59, 107, 255, 0.16)',
    tabActiveText: '#14151a',
    controlHover: 'rgba(0, 0, 0, 0.08)',
    controlMinHover: 'rgba(59, 107, 255, 0.22)',
    controlCloseHover: '#e5484d',
    shadow: 'rgba(0, 0, 0, 0.18)'
  }
}

export const themes: Theme[] = [nodriftDark, nodriftPurple, nodriftLight]

export const defaultThemeId = nodriftDark.id
