import { Palette, Server, Shield, Users, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { useApi, apiPost } from '../hooks/useApi'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { UserManagement } from './UserManagement'
import type { Theme } from '../types'

interface Config {
  admin_email: string
  network_interface: string
  smtp_host: string
  smtp_port: number
  smtp_configured: boolean
  abuseipdb_configured: boolean
}

const THEMES: { id: Theme; label: string; bg: string; accent: string; text: string }[] = [
  { id: 'dark',      label: 'Dark',      bg: '#0d1117', accent: '#58a6ff', text: '#c9d1d9' },
  { id: 'light',     label: 'Light',     bg: '#f6f8fa', accent: '#0969da', text: '#24292f' },
  { id: 'cyberpunk', label: 'Cyberpunk', bg: '#0a0015', accent: '#d400ff', text: '#e0aaff' },
  { id: 'ocean',     label: 'Ocean',     bg: '#001d3d', accent: '#00b4d8', text: '#90e0ef' },
  { id: 'blood',     label: 'Blood',     bg: '#1a0000', accent: '#ff4444', text: '#ffb3b3' },
  { id: 'matrix',    label: 'Matrix',    bg: '#000d00', accent: '#00ff41', text: '#00dd00' },
]

export function Settings() {
  const { data: config, loading, error } = useApi<Config>('/api/config')
  const { theme, setTheme } = useTheme()
  const { isAdmin } = useAuth()

  const handleTheme = (t: Theme) => {
    setTheme(t)
    toast.success(`Tema "${THEMES.find(x => x.id === t)?.label}" aplicado`, { duration: 2000 })
  }

  const sendTestEmail = () => {
    const p = apiPost('/api/alerts/test')
    toast.promise(p, {
      loading: 'Enviando correo de prueba...',
      success: () => `✅ Correo enviado a ${config?.admin_email}`,
      error: (e) => `Error: ${(e as Error).message}`,
    })
  }

  return (
    <div className="view-content">
      <div className="view-header">
        <div>
          <h1>Configuración</h1>
          <p className="view-sub">Ajustes del sistema IDS y personalización de interfaz</p>
        </div>
      </div>

      {/* Tema */}
      <div className="card mb-4">
        <div className="card-header"><h3><Palette size={16} /> Tema de Interfaz</h3></div>
        <p className="muted" style={{ padding: '12px 20px 4px', fontSize: '0.875rem' }}>
          Selecciona el esquema de colores. Tu preferencia se guarda automáticamente en el navegador.
        </p>
        <div className="theme-grid">
          {THEMES.map(t => (
            <button
              key={t.id}
              className={`theme-btn ${theme === t.id ? 'theme-active' : ''}`}
              onClick={() => handleTheme(t.id)}
            >
              <div className="theme-swatch-lg" style={{ background: t.bg, border: `2px solid ${t.accent}` }}>
                <div className="theme-swatch-bar" style={{ background: t.accent }} />
                <div className="theme-swatch-dot" style={{ background: t.accent, opacity: 0.5 }} />
                <div className="theme-swatch-line" style={{ background: t.text, opacity: 0.3 }} />
              </div>
              <span className="theme-label">{t.label}</span>
              {theme === t.id && <span className="theme-check">✓</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Backend / SMTP */}
      <div className="card mb-4">
        <div className="card-header"><h3><Server size={16} /> Configuración del Backend</h3></div>

        {loading && <div className="loading">Cargando configuración...</div>}
        {error && (
          <div className="msg msg-error">
            Backend no disponible. Asegúrate de que el servidor Python esté corriendo en el puerto 8000.<br />
            <code>cd backend &amp;&amp; python main.py</code>
          </div>
        )}

        {config && (
          <>
            <div className="info-rows">
              <div className="info-row">
                <span>Email administrador</span>
                <code>{config.admin_email}</code>
              </div>
              <div className="info-row">
                <span>Interfaz de red</span>
                <code>{config.network_interface}</code>
              </div>
              <div className="info-row">
                <span>Servidor SMTP</span>
                <code>{config.smtp_host}:{config.smtp_port}</code>
              </div>
              <div className="info-row">
                <span>SMTP configurado</span>
                <span className={`pill ${config.smtp_configured ? 'pill-green' : 'pill-red'}`}>
                  {config.smtp_configured ? 'Sí' : 'No — configura .env'}
                </span>
              </div>
              <div className="info-row">
                <span>AbuseIPDB API</span>
                <span className={`pill ${config.abuseipdb_configured ? 'pill-green' : 'pill-red'}`}>
                  {config.abuseipdb_configured ? 'Configurado' : 'No configurado'}
                </span>
              </div>
            </div>

            {isAdmin && (
              <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
                <button
                  className="btn btn-primary"
                  onClick={sendTestEmail}
                  disabled={!config.smtp_configured}
                  title={!config.smtp_configured ? 'Configura SMTP_USER y SMTP_PASSWORD en .env primero' : ''}
                >
                  <Mail size={15} /> Enviar correo de prueba
                </button>
                {!config.smtp_configured && (
                  <p className="muted" style={{ marginTop: 8, fontSize: '0.8rem' }}>
                    ⚠️ SMTP no configurado. Edita <code>backend/.env</code> y completa <code>SMTP_USER</code> y <code>SMTP_PASSWORD</code>.
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Gestión de usuarios */}
      <div className="mb-4">
        <div className="view-header" style={{ marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
              <Users size={18} style={{ display: 'inline', marginRight: 8 }} />
              Gestión de Usuarios
            </h2>
            <p className="view-sub">
              {isAdmin ? 'Control total de cuentas del sistema' : 'Solo visible para administradores'}
            </p>
          </div>
        </div>
        {isAdmin
          ? <UserManagement />
          : (
            <div className="card">
              <div style={{ padding: '32px', textAlign: 'center' }}>
                <Shield size={36} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Necesitas rol de <strong>Administrador</strong> para gestionar usuarios.<br />
                  Cierra sesión e inicia con la cuenta <code>admin</code>.
                </p>
              </div>
            </div>
          )
        }
      </div>

      {/* Variables de entorno */}
      <div className="card">
        <div className="card-header"><h3><Shield size={16} /> Variables de Entorno Requeridas</h3></div>
        <p className="muted" style={{ padding: '12px 20px 4px', fontSize: '0.875rem' }}>
          Edita <code>backend/.env</code> y completa los valores. Nunca incluyas credenciales en el código fuente.
        </p>
        <pre className="code-block">{`# backend/.env
ADMIN_EMAIL=tu_correo@gmail.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=correo_remitente@gmail.com
SMTP_PASSWORD=xxxx_xxxx_xxxx_xxxx   ← Contraseña de Aplicación Google
NETWORK_INTERFACE=eth0
ABUSEIPDB_API_KEY=tu_api_key
API_SECRET_KEY=clave_secreta_32_chars`}</pre>
      </div>
    </div>
  )
}
