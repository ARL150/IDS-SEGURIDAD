import { useState } from 'react'
import { Shield, ShieldOff, Plus, Trash2, RefreshCw, Radar } from 'lucide-react'
import { toast } from 'sonner'
import { useApi, apiPost, apiDelete } from '../hooks/useApi'
import { NetworkScanner } from './NetworkScanner'
import type { NetworkDevice } from '../types'

type Tab = 'whitelist' | 'scanner'

export function WhitelistModule() {
  const [tab, setTab] = useState<Tab>('whitelist')
  const { data: devices, loading, error, refresh } = useApi<NetworkDevice[]>('/api/devices', 5000)
  const [form, setForm] = useState({ ip: '', mac: '', label: '' })
  const [saving, setSaving] = useState(false)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const p = apiPost('/api/whitelist', { ...form, authorized: true })
      .then(() => { setForm({ ip: '', mac: '', label: '' }); refresh() })
    toast.promise(p, {
      loading: 'Guardando dispositivo...',
      success: `✅ ${form.ip} agregado a la lista blanca`,
      error: (err) => `Error: ${(err as Error).message}`,
    })
    p.finally(() => setSaving(false))
  }

  const handleRemove = (ip: string) => {
    toast.warning(`¿Eliminar ${ip} de la lista blanca?`, {
      action: {
        label: 'Eliminar',
        onClick: () => {
          toast.promise(
            apiDelete(`/api/whitelist/${encodeURIComponent(ip)}`).then(refresh),
            { loading: 'Eliminando...', success: `${ip} eliminado`, error: (e) => `Error: ${(e as Error).message}` }
          )
        },
      },
      cancel: { label: 'Cancelar', onClick: () => {} },
      duration: 8000,
    })
  }

  const handleAuthorize = (dev: NetworkDevice) => {
    const p = apiPost('/api/whitelist', { ip: dev.ip, mac: dev.mac, label: '', authorized: true }).then(refresh)
    toast.promise(p, {
      loading: 'Autorizando...', success: `${dev.ip} agregado a la lista blanca`,
      error: (e) => `Error: ${(e as Error).message}`,
    })
  }

  return (
    <div className="view-content">
      <div className="view-header">
        <div>
          <h1>Listas Blancas</h1>
          <p className="view-sub">Administra dispositivos autorizados (Capa 2 y 3 del modelo OSI)</p>
        </div>
        {tab === 'whitelist' && (
          <button className="btn btn-ghost" onClick={refresh}><RefreshCw size={16} /> Actualizar</button>
        )}
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'whitelist' ? 'tab-active' : ''}`} onClick={() => setTab('whitelist')}>
          <Shield size={14} style={{ display: 'inline', marginRight: 6 }} />
          Lista Blanca ({devices?.filter(d => d.in_whitelist).length ?? 0})
        </button>
        <button className={`tab ${tab === 'scanner' ? 'tab-active' : ''}`} onClick={() => setTab('scanner')}>
          <Radar size={14} style={{ display: 'inline', marginRight: 6 }} />
          Escáner de Red
        </button>
      </div>

      {tab === 'scanner' && <NetworkScanner />}

      {tab === 'whitelist' && (
        <>
          <div className="card mb-4">
            <div className="card-header"><h3><Plus size={16} /> Agregar Dispositivo Autorizado</h3></div>
            <form className="form-grid" onSubmit={handleAdd}>
              <div className="form-group">
                <label>Dirección IP *</label>
                <input className="input" placeholder="192.168.1.100" value={form.ip}
                  onChange={e => setForm(f => ({ ...f, ip: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>Dirección MAC *</label>
                <input className="input" placeholder="AA:BB:CC:DD:EE:FF" value={form.mac}
                  onChange={e => setForm(f => ({ ...f, mac: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>Etiqueta / Descripción</label>
                <input className="input" placeholder="Servidor Web, PC Secretaría..." value={form.label}
                  onChange={e => setForm(f => ({ ...f, label: e.target.value }))} />
              </div>
              <div className="form-group form-action">
                <button className="btn btn-primary" type="submit" disabled={saving}>
                  <Plus size={16} /> {saving ? 'Guardando...' : 'Agregar'}
                </button>
              </div>
            </form>
          </div>

          {loading && <div className="loading">Cargando dispositivos...</div>}
          {error && <div className="msg msg-error">Error de conexión: {error}</div>}

          <div className="card">
            <div className="card-header">
              <h3>Dispositivos Detectados</h3>
              <span className="pill">{devices?.length ?? 0} total</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Estado</th><th>IP</th><th>MAC</th>
                    <th>Etiqueta</th><th>Último contacto</th>
                    <th>Paquetes</th><th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {(devices ?? []).map(dev => (
                    <tr key={dev.ip} className={!dev.authorized ? 'row-danger' : ''}>
                      <td>
                        {dev.authorized
                          ? <span className="badge-ok"><Shield size={14} /> Autorizado</span>
                          : <span className="badge-danger"><ShieldOff size={14} /> No autorizado</span>
                        }
                      </td>
                      <td><code>{dev.ip}</code></td>
                      <td><code>{dev.mac || '—'}</code></td>
                      <td>{dev.label || <span className="muted">Sin etiqueta</span>}</td>
                      <td className="muted">
                        {dev.last_seen === 'Nunca' ? 'Nunca'
                          : new Date(dev.last_seen).toLocaleString('es-MX')}
                      </td>
                      <td>{dev.packets.toLocaleString()}</td>
                      <td>
                        {dev.in_whitelist
                          ? <button className="btn-icon danger" onClick={() => handleRemove(dev.ip)}
                              title="Eliminar de lista blanca"><Trash2 size={14} /></button>
                          : <button className="btn-icon success" onClick={() => handleAuthorize(dev)}
                              title="Agregar a lista blanca"><Shield size={14} /></button>
                        }
                      </td>
                    </tr>
                  ))}
                  {!devices?.length && !loading && (
                    <tr><td colSpan={7} className="empty-row">No hay dispositivos detectados aún</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
