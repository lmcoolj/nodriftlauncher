import { TitleBar } from './components/TitleBar'
import { HomeTab } from './tabs/HomeTab'
import { ModsTab } from './tabs/ModsTab'
import { CosmeticsTab } from './tabs/CosmeticsTab'
import { SettingsTab } from './tabs/SettingsTab'
import { InstanceViewer } from './instances/InstanceViewer'
import { useNavigation } from './useNavigation'

export function App(): React.JSX.Element {
  const { tab, instanceId, setTab } = useNavigation()

  return (
    <div className="app">
      <TitleBar view={tab} onSelect={setTab} />
      <main className="content">
        {tab === 'home' &&
          (instanceId ? <InstanceViewer instanceId={instanceId} /> : <HomeTab />)}
        {tab === 'mods' && <ModsTab />}
        {tab === 'cosmetics' && <CosmeticsTab />}
        {tab === 'settings' && <SettingsTab />}
      </main>
    </div>
  )
}
