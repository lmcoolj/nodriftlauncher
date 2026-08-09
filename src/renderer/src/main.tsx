import React from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { ThemeProvider } from './theme/ThemeProvider'
import { AuthProvider } from './auth/useAuth'
import { InstancesProvider } from './instances/useInstances'
import { LaunchProvider } from './instances/useLaunch'
import { NavigationProvider } from './useNavigation'
import { NotificationsProvider } from './useNotifications'
import './styles/global.css'

const container = document.getElementById('root')
if (!container) {
  throw new Error('Root container #root not found')
}

createRoot(container).render(
  <React.StrictMode>
    <ThemeProvider>
      <NotificationsProvider>
        <AuthProvider>
          <InstancesProvider>
            <LaunchProvider>
              <NavigationProvider>
                <App />
              </NavigationProvider>
            </LaunchProvider>
          </InstancesProvider>
        </AuthProvider>
      </NotificationsProvider>
    </ThemeProvider>
  </React.StrictMode>
)
