import { useState } from 'react'
import { AlertTriangle, Plus, RefreshCw, Skull, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { useApi, apiPost } from '../hooks/useApi'
import type { ThreatEvent, BlacklistEntry } from '../types'

interface ThreatsResponse {
  events: ThreatEvent[]
  blacklist: BlacklistEntry[]
  stats: { total_events: number; critical: number; high: number }
}

const SEV_CLASS: Record<string, string> = {
  critical: 'sev-critical',
  high: 'sev-high',
  medium: 'sev-medium',
  low: 'sev-low',
}

export function ThreatIntel() {
  const { data, loading, error, refresh } = useApi<ThreatsResponse>('/api/threats', 5000)
  const [tab, setTab] = useState<'events' | 'blacklist'>('events')
  const [form, setForm] = useState({ ip: '', threat_type: '', severity: 'high', description: '' })
  const [saving, setSaving] = useState(false)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const p = apiPost('/api/threats/blacklist', form).then(() => {
      setForm({ ip: '', threat_type: '', severity: 'high', description: '' })
      refresh()
    })
    toast.promise(p, {
      loading: 'Agregando IP a lista negra...',
      success: `🚨 ${form.ip} agregada a la lista negra`,
      error: (err) => `Error: ${(err as Error).message}`,
    })
    p.finally(() => setSaving(false))
  }

  return (
    <div className="view-content">
      <div className="view-header">
        <div>
          <h1>Inteligencia de Amenazas</h1>
          <p className="view-sub">Lista negra de IPs maliciosas y eventos de amenazas detectados</p>
        </div>
        <button className="btn btn-ghost" onClick={refresh}><RefreshCw size={16} /> Actualizar</button>
      </div>

      <div className="stats-mini">
        <div className="mini-card accent-red">
          <Skull size={20} />
          <div>
            <div className="mini-val">{data?.stats.total_events ?? 0}</div>
            <div className="mini-label">Eventos totales</div>
          </div>
        </div>
        <div className="mini-card accent-orange">
          <Zap size={20} />
          <div>
            <div className="mini-val">{data?.stats.critical ?? 0}</div>
            <div className="mini-label">Eventos críticos</div>
          </div>
        </div>
        <div className="mini-card">
          <AlertTriangle size={20} />
          <div>
            <div className="mini-val">{data?.blacklist.length ?? 0}</div>
            <div className="mini-label">IPs en lista negra</div>
          </div>
        </div>
      </div>

      {loading && <div className="loading">Cargando datos de amenazas...</div>}
      {error && <div className="msg msg-error">Error de conexión: {error}</div>}

      <div className="tabs">
        <button className={`tab ${tab === 'events' ? 'tab-active' : ''}`} onClick={() => setTab('events')}>
          Eventos Detectados ({data?.events.length ?? 0})
        </button>
        <button className={`tab ${tab === 'blacklist' ? 'tab-active' : ''}`} onClick={() => setTab('blacklist')}>
          Lista Negra ({data?.blacklist.length ?? 0})
        </button>
      </div>

      {tab === 'events' && (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>IP Origen</th>
                  <th>IP Destino (Amenaza)</th>
                  <th>Tipo</th>
                  <th>Severidad</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {(data?.events ?? []).map(ev => (
                  <tr key={ev.id} className="row-danger">
                    <td className="muted">{new Date(ev.timestamp).toLocaleString('es-MX')}</td>
                    <td><code>{ev.source_ip}</code></td>
                    <td><code className="text-danger">{ev.dest_ip}</code></td>
                    <td>{ev.threat_type}</td>
                    <td><span className={`sev ${SEV_CLASS[ev.severity]}`}>{ev.severity.toUpperCase()}</span></td>
                    <td>{ev.alert_sent ? '✅' : '❌'}</td>
                  </tr>
                ))}
                {!data?.events.length && !loading && (
                  <tr><td colSpan={6} className="empty-row">Sin eventos de amenaza detectados. Buen indicador de seguridad.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'blacklist' && (
        <>
          <div className="card mb-4">
            <div className="card-header"><h3><Plus size={16} /> Agregar IP a Lista Negra</h3></div>
            <form className="form-grid" onSubmit={handleAdd}>
              <div className="form-group">
                <label>Dirección IP *</label>
                <input className="input" placeholder="1.2.3.4" value={form.ip}
                  onChange={e => setForm(f => ({ ...f, ip: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>Tipo de Amenaza *</label>
                <input className="input" placeholder="Botnet, Ransomware, C2..." value={form.threat_type}
                  onChange={e => setForm(f => ({ ...f, threat_type: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>Severidad</label>
                <select className="input" value={form.severity}
                  onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}>
                  <option value="critical">Crítico</option>
                  <option value="high">Alto</option>
                  <option value="medium">Medio</option>
                  <option value="low">Bajo</option>
                </select>
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <input className="input" placeholder="Descripción de la amenaza" value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="form-group form-action">
                <button className="btn btn-danger" type="submit" disabled={saving}>
                  <Plus size={16} /> {saving ? 'Agregando...' : 'Agregar a lista negra'}
                </button>
              </div>
            </form>
          </div>

          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>IP</th><th>Tipo</th><th>Severidad</th><th>Descripción</th></tr>
                </thead>
                <tbody>
                  {(data?.blacklist ?? []).map(b => (
                    <tr key={b.ip}>
                      <td><code className="text-danger">{b.ip}</code></td>
                      <td>{b.type}</td>
                      <td><span className={`sev ${SEV_CLASS[b.severity]}`}>{b.severity.toUpperCase()}</span></td>
                      <td className="muted">{b.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
