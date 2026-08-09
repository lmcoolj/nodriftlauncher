import React from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { ThemeProvider } from './theme/ThemeProvider'
import { AuthProvider } from './auth/useAuth'
import { InstancesProvider } from './instances/useInstances'
import { LaunchProvider } from './instances/useLaunch'
import './styles/global.css'

const container = document.getElementById('root')
if (!container) {
  throw new Error('Root container #root not found')
}

createRoot(container).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <InstancesProvider>
          <LaunchProvider>
            <App />
          </LaunchProvider>
        </InstancesProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
)
