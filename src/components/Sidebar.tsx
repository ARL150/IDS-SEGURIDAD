import {
  LayoutDashboard, Shield, ShieldX, Globe, AlertTriangle, Search,
  Bell, Settings, Activity, LogOut, ShieldCheck, User, Wifi
} from 'lucide-react'
import { toast } from 'sonner'
import type { ActiveView } from '../types'
import { useAuth } from '../contexts/AuthContext'

interface Props {
  active: ActiveView
  setActive: (v: ActiveView) => void
  alertCount: number
  running: boolean
}

const nav: { id: ActiveView; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'dashboard',  label: 'Dashboard',         icon: LayoutDashboard },
  { id: 'packets',    label: 'Tráfico en vivo',   icon: Wifi },
  { id: 'whitelist',  label: 'Lista Blanca',      icon: Shield },
  { id: 'blacklist',  label: 'Lista Negra',       icon: ShieldX },
  { id: 'domains',    label: 'Monitoreo Sitios',  icon: Globe },
  { id: 'threats',    label: 'Inteligencia',      icon: AlertTriangle },
  { id: 'forensics',  label: 'Forense',           icon: Search },
  { id: 'alerts',     label: 'Alertas',           icon: Bell },
  { id: 'settings',   label: 'Configuración',     icon: Settings },
]

export function Sidebar({ active, setActive, alertCount, running }: Props) {
  const { user, logout, isAdmin } = useAuth()

  const handleLogout = () => {
    toast.info('Sesión cerrada. ¡Hasta pronto!', { duration: 2500 })
    setTimeout(logout, 600)
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <Shield size={28} className="logo-icon" />
        <div>
          <div className="logo-title">IDS Institucional</div>
          <div className="logo-sub">v1.0 · GPL-3.0</div>
        </div>
      </div>

      <div className="sidebar-status">
        <Activity size={14} />
        <span className={`status-dot ${running ? 'running' : 'stopped'}`} />
        <span>{running ? 'Capturando' : 'Detenido'}</span>
      </div>

      <nav className="sidebar-nav">
        {nav.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`nav-item ${active === id ? 'active' : ''}`}
            onClick={() => setActive(id)}
          >
            <Icon size={18} />
            <span>{label}</span>
            {id === 'alerts' && alertCount > 0 && (
              <span className="badge">{alertCount > 99 ? '99+' : alertCount}</span>
            )}
          </button>
        ))}
      </nav>

      {/* ── Perfil de usuario ── */}
      <div className="sidebar-user">
        <div className={`sidebar-avatar ${isAdmin ? 'sidebar-avatar--admin' : ''}`}>
          {user?.name.charAt(0).toUpperCase() ?? '?'}
        </div>
        <div className="sidebar-user-info">
          <div className="sidebar-user-name">{user?.name}</div>
          <div className="sidebar-user-role">
            {isAdmin
              ? <><ShieldCheck size={11} /> Administrador</>
              : <><User size={11} /> Operador</>
            }
          </div>
        </div>
        <button className="btn-icon sidebar-logout" onClick={handleLogout} title="Cerrar sesión">
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  )
}
