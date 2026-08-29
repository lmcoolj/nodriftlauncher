import { Sidebar } from './components/Sidebar'
import { TitleBar } from './components/TitleBar'
import { HomeTab } from './tabs/HomeTab'
import { ModsTab } from './tabs/ModsTab'
import { PacksTab } from './tabs/PacksTab'
import { CosmeticsTab } from './tabs/CosmeticsTab'
import { SettingsTab } from './tabs/SettingsTab'
import { InstanceViewer } from './instances/InstanceViewer'
import { useNavigation } from './useNavigation'

export function App(): React.JSX.Element {
  const { tab, instanceId } = useNavigation()

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <TitleBar />
        <main className="content">
          {tab === 'home' &&
            (instanceId ? <InstanceViewer instanceId={instanceId} /> : <HomeTab />)}
          {tab === 'mods' && <ModsTab />}
          {tab === 'packs' && <PacksTab />}
          {tab === 'cosmetics' && <CosmeticsTab />}
          {tab === 'settings' && <SettingsTab />}
        </main>
      </div>
    </div>
  )
}
