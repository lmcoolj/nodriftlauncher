import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react'
import type { Theme } from './tokens'
import { themes, defaultThemeId } from './themes'

interface ThemeContextValue {
  theme: Theme
  themes: Theme[]
  setThemeId: (id: string) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const STORAGE_KEY = 'nodrift.themeId'

/**
 * Push a theme's tokens onto :root as CSS custom properties. Token keys are used
 * verbatim, so `surfaceRaised` becomes `--nd-surfaceRaised` and the CSS reads it
 * with the same name (CSS custom properties are case-sensitive).
 */
function applyTheme(theme: Theme): void {
  const root = document.documentElement
  for (const [key, value] of Object.entries(theme.tokens)) {
    root.style.setProperty(`--nd-${key}`, value)
  }
  root.dataset.theme = theme.id
  root.dataset.scheme = theme.scheme
}

export function ThemeProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [themeId, setThemeId] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) ?? defaultThemeId
  })

  const theme = useMemo<Theme>(() => {
    return themes.find((t) => t.id === themeId) ?? themes[0]
  }, [themeId])

  useEffect(() => {
    applyTheme(theme)
    localStorage.setItem(STORAGE_KEY, theme.id)
  }, [theme])

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, themes, setThemeId }),
    [theme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return ctx
}
