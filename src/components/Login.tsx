import { useState, type FormEvent } from 'react'
import { Shield, Eye, EyeOff, Wifi, Lock, User } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '../contexts/AuthContext'

export function Login() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password) return
    setLoading(true)
    try {
      await login(username.trim(), password)
      toast.success(`Bienvenido al sistema IDS`)
    } catch (err) {
      toast.error((err as Error).message, { duration: 5000 })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-root">
      {/* ── Panel izquierdo — branding ── */}
      <div className="login-brand">
        <div className="login-brand-inner">
          <div className="login-brand-logo">
            <Shield size={56} />
          </div>
          <h1 className="login-brand-title">IDS Institucional</h1>
          <p className="login-brand-sub">
            Sistema de Detección de Intrusos para infraestructura de red
          </p>

          <div className="login-features">
            <div className="login-feature">
              <div className="login-feature-icon"><Shield size={18} /></div>
              <div>
                <strong>Listas blancas</strong>
                <span>Control de acceso por IP y MAC (Capa 2 y 3)</span>
              </div>
            </div>
            <div className="login-feature">
              <div className="login-feature-icon"><Wifi size={18} /></div>
              <div>
                <strong>Monitoreo en tiempo real</strong>
                <span>Captura de paquetes DNS y HTTP</span>
              </div>
            </div>
            <div className="login-feature">
              <div className="login-feature-icon"><Lock size={18} /></div>
              <div>
                <strong>Threat Intelligence</strong>
                <span>Detección de IPs maliciosas y forense automático</span>
              </div>
            </div>
          </div>

          <div className="login-brand-footer">
            Materia: Seguridad en Sistemas · GPL-3.0
          </div>
        </div>
      </div>

      {/* ── Panel derecho — formulario ── */}
      <div className="login-form-panel">
        <div className="login-card">
          <div className="login-card-header">
            <div className="login-card-icon">
              <Shield size={28} />
            </div>
            <h2>Iniciar sesión</h2>
            <p>Accede con tus credenciales institucionales</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit} autoComplete="off">
            <div className="login-field">
              <label htmlFor="username">Usuario</label>
              <div className="login-input-wrap">
                <User size={17} className="login-input-icon" />
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  placeholder="Ingresa tu usuario"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="password">Contraseña</label>
              <div className="login-input-wrap">
                <Lock size={17} className="login-input-icon" />
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Ingresa tu contraseña"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  className="login-eye"
                  onClick={() => setShowPass(v => !v)}
                  tabIndex={-1}
                  aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className={`login-btn ${loading ? 'login-btn--loading' : ''}`}
              disabled={loading}
            >
              {loading ? (
                <span className="login-spinner" />
              ) : (
                <Shield size={18} />
              )}
              {loading ? 'Verificando...' : 'Acceder al sistema'}
            </button>
          </form>

          <div className="login-hint">
            <span>Credenciales por defecto:</span>
            <code>admin</code> / <code>Admin</code>
          </div>
        </div>

        <p className="login-legal">
          El acceso no autorizado a este sistema está prohibido y puede constituir un
          delito conforme al Código Penal Federal de México (Art. 211 bis).
        </p>
      </div>
    </div>
  )
}
