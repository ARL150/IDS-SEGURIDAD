import { useState } from 'react'
import { UserPlus, Power, Trash2, Key, RefreshCw, ShieldCheck, User } from 'lucide-react'
import { toast } from 'sonner'
import { useApi, apiPost, apiDelete, apiPatch } from '../hooks/useApi'
import { useAuth } from '../contexts/AuthContext'

interface IUser {
  id: string
  username: string
  name: string
  email: string
  role: string
  active: boolean
  created_at: string
}

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrador',
  operator: 'Operador',
}

export function UserManagement() {
  const { user: me } = useAuth()
  const { data: users, loading, error, refresh } = useApi<IUser[]>('/api/auth/users', 0)
  const [form, setForm] = useState({
    username: '', password: '', name: '', email: '', role: 'operator',
  })
  const [saving, setSaving] = useState(false)
  const [pwdForm, setPwdForm] = useState({ username: '', password: '' })
  const [showPwd, setShowPwd] = useState(false)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const p = apiPost('/api/auth/users', form).then(() => {
      setForm({ username: '', password: '', name: '', email: '', role: 'operator' })
      refresh()
    })
    toast.promise(p, {
      loading: 'Creando usuario...',
      success: `Usuario "${form.username}" creado`,
      error: (err) => `Error: ${(err as Error).message}`,
    })
    p.finally(() => setSaving(false))
  }

  const handleToggle = (u: IUser) => {
    const p = apiPatch(`/api/auth/users/${u.id}/toggle`).then(refresh)
    toast.promise(p, {
      loading: u.active ? 'Desactivando usuario...' : 'Activando usuario...',
      success: u.active ? `${u.username} desactivado` : `${u.username} activado`,
      error: (err) => `Error: ${(err as Error).message}`,
    })
  }

  const handleDelete = (u: IUser) => {
    toast.warning(`¿Eliminar al usuario "${u.username}"? Esta acción no se puede deshacer.`, {
      action: {
        label: 'Eliminar',
        onClick: () => {
          const p = apiDelete(`/api/auth/users/${u.id}`).then(refresh)
          toast.promise(p, {
            loading: 'Eliminando...',
            success: `Usuario ${u.username} eliminado`,
            error: (err) => `Error: ${(err as Error).message}`,
          })
        },
      },
      cancel: { label: 'Cancelar', onClick: () => {} },
      duration: 8000,
    })
  }

  const handleChangePwd = async (e: React.FormEvent) => {
    e.preventDefault()
    const p = apiPost('/api/auth/change-password', {
      username: pwdForm.username,
      new_password: pwdForm.password,
    }).then(() => setPwdForm({ username: '', password: '' }))
    toast.promise(p, {
      loading: 'Cambiando contraseña...',
      success: `Contraseña de ${pwdForm.username} actualizada`,
      error: (err) => `Error: ${(err as Error).message}`,
    })
  }

  return (
    <div>
      {/* ── Crear usuario ── */}
      <div className="card mb-4">
        <div className="card-header">
          <h3><UserPlus size={16} /> Crear Usuario</h3>
        </div>
        <form className="form-grid" onSubmit={handleAdd}>
          <div className="form-group">
            <label>Nombre completo *</label>
            <input className="input" placeholder="Ej: María García" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label>Nombre de usuario *</label>
            <input className="input" placeholder="Ej: mgarcia" value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label>Correo electrónico *</label>
            <input className="input" type="email" placeholder="usuario@empresa.com" value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label>Contraseña *</label>
            <input className="input" type="password" placeholder="Mínimo 6 caracteres" value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))} minLength={6} required />
          </div>
          <div className="form-group">
            <label>Rol</label>
            <select className="input" value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              <option value="operator">Operador</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          <div className="form-group form-action">
            <button className="btn btn-primary" type="submit" disabled={saving}>
              <UserPlus size={15} /> {saving ? 'Creando...' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>

      {/* ── Cambiar contraseña ── */}
      <div className="card mb-4">
        <div className="card-header">
          <h3><Key size={16} /> Cambiar Contraseña</h3>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowPwd(v => !v)}>
            {showPwd ? 'Cerrar' : 'Abrir'}
          </button>
        </div>
        {showPwd && (
          <form className="form-grid" onSubmit={handleChangePwd}>
            <div className="form-group">
              <label>Usuario *</label>
              <select className="input" value={pwdForm.username}
                onChange={e => setPwdForm(f => ({ ...f, username: e.target.value }))} required>
                <option value="">— Selecciona usuario —</option>
                {(users ?? []).map(u => (
                  <option key={u.id} value={u.username}>{u.name} ({u.username})</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Nueva contraseña *</label>
              <input className="input" type="password" placeholder="Nueva contraseña" value={pwdForm.password}
                onChange={e => setPwdForm(f => ({ ...f, password: e.target.value }))} minLength={6} required />
            </div>
            <div className="form-group form-action">
              <button className="btn btn-ghost" type="submit">
                <Key size={15} /> Cambiar contraseña
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ── Lista de usuarios ── */}
      <div className="card">
        <div className="card-header">
          <h3><User size={16} /> Usuarios del Sistema</h3>
          <button className="btn btn-ghost btn-sm" onClick={refresh}>
            <RefreshCw size={14} />
          </button>
        </div>

        {loading && <div className="loading">Cargando usuarios...</div>}
        {error && <div className="msg msg-error">Error: {error}</div>}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Usuario</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Creado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(users ?? []).map(u => (
                <tr key={u.id} className={!u.active ? 'row-inactive' : ''}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className={`avatar ${u.role === 'admin' ? 'avatar-admin' : 'avatar-op'}`}>
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      {u.name}
                      {u.id === me?.id && <span className="pill" style={{ fontSize: '0.65rem' }}>Tú</span>}
                    </div>
                  </td>
                  <td><code>{u.username}</code></td>
                  <td className="muted">{u.email}</td>
                  <td>
                    <span className={`pill ${u.role === 'admin' ? 'pill-accent' : ''}`}>
                      {u.role === 'admin' ? <ShieldCheck size={12} /> : <User size={12} />}
                      {' '}{ROLE_LABEL[u.role] ?? u.role}
                    </span>
                  </td>
                  <td>
                    <span className={`pill ${u.active ? 'pill-green' : 'pill-red'}`}>
                      {u.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="muted">{new Date(u.created_at).toLocaleDateString('es-MX')}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {u.id !== me?.id && (
                        <>
                          <button className={`btn-icon ${u.active ? 'danger' : 'success'}`}
                            onClick={() => handleToggle(u)}
                            title={u.active ? 'Desactivar' : 'Activar'}>
                            <Power size={14} />
                          </button>
                          <button className="btn-icon danger" onClick={() => handleDelete(u)}
                            title="Eliminar usuario">
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
