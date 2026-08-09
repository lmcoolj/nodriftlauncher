import { useState } from 'react'
import { TitleBar } from './components/TitleBar'
import { HomeTab } from './tabs/HomeTab'
import { ModsTab } from './tabs/ModsTab'
import { CosmeticsTab } from './tabs/CosmeticsTab'
import { SettingsTab } from './tabs/SettingsTab'
import type { View } from './navigation'

export function App(): React.JSX.Element {
  const [view, setView] = useState<View>('home')

  return (
    <div className="app">
      <TitleBar view={view} onSelect={setView} />
      <main className="content">
        {view === 'home' && <HomeTab />}
        {view === 'mods' && <ModsTab />}
        {view === 'cosmetics' && <CosmeticsTab />}
        {view === 'settings' && <SettingsTab />}
      </main>
    </div>
  )
}
