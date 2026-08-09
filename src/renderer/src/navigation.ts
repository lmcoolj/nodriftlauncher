/** The primary navigation model for the launcher shell. */

/** Tabs shown in the title-bar tab row (per the design sketch). */
export const MAIN_TABS = ['home', 'mods', 'cosmetics'] as const

export type MainTab = (typeof MAIN_TABS)[number]

/** Settings is reachable via the gear button, not the main tab row. */
export type View = MainTab | 'settings'

export const TAB_LABELS: Record<MainTab, string> = {
  home: 'Home',
  mods: 'Mods',
  cosmetics: 'Cosmetics'
}
