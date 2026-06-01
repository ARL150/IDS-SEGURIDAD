import { useState } from 'react'
import { Toaster } from 'sonner'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { useApi } from './hooks/useApi'
import { useTheme } from './contexts/ThemeContext'
import { Sidebar } from './components/Sidebar'
import { Login } from './components/Login'
import { Dashboard } from './components/Dashboard'
import { WhitelistModule } from './components/WhitelistModule'
import { BlacklistModule } from './components/BlacklistModule'
import { SiteMonitor } from './components/SiteMonitor'
import { ThreatIntel } from './components/ThreatIntel'
import { Forensics } from './components/Forensics'
import { PacketMonitor } from './components/PacketMonitor'
import { AlertLog } from './components/AlertLog'
import { Settings } from './components/Settings'
import type { ActiveView, SystemStatus, Theme } from './types'
import './App.css'

const THEME_SONNER: Record<Theme, 'light' | 'dark'> = {
  dark: 'dark', light: 'light', cyberpunk: 'dark',
  ocean: 'dark', blood: 'dark', matrix: 'dark',
}

/* ── App principal (solo se monta cuando hay sesión activa) ── */
function MainApp() {
  const [activeView, setActiveView] = useState<ActiveView>('dashboard')
  const { data: status, refresh: refreshStatus } = useApi<SystemStatus>('/api/status', 3000)

  const views: Record<ActiveView, React.ReactNode> = {
    dashboard: <Dashboard status={status} onRefresh={refreshStatus} />,
    packets:   <PacketMonitor />,
    whitelist: <WhitelistModule />,
    blacklist: <BlacklistModule />,
    domains:   <SiteMonitor />,
    threats:   <ThreatIntel />,
    forensics: <Forensics />,
    alerts:    <AlertLog />,
    settings:  <Settings />,
  }

  return (
    <div className="app-layout">
      <Sidebar
        active={activeView}
        setActive={setActiveView}
        alertCount={status?.threats_detected ?? 0}
        running={status?.running ?? false}
      />
      <main className="main-area">
        {views[activeView]}
      </main>
    </div>
  )
}

/* ── Gate: decide si mostrar Login o la app ── */
function AppGate() {
  const { user, token } = useAuth()
  const { theme } = useTheme()

  return (
    <>
      <Toaster
        position="top-right"
        richColors
        theme={THEME_SONNER[theme]}
        toastOptions={{ duration: 4000 }}
        expand
      />
      {user && token ? <MainApp /> : <Login />}
    </>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppGate />
      </AuthProvider>
    </ThemeProvider>
  )
}
