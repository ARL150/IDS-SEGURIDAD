import { useState, useCallback } from 'react'
import {
  ShieldX, RefreshCw, Plus, Trash2, AlertTriangle,
  Globe, Info, Search,
} from 'lucide-react'
import { toast } from 'sonner'
import { useApi, apiPost, apiDelete } from '../hooks/useApi'
import { useAuth } from '../contexts/AuthContext'
import type { BlacklistData, ManualBlacklistEntry } from '../types'

type Tab = 'feodo' | 'manual'

const SEV_BADGE: Record<string, string> = {
  critical: 'badge-critical',
  high:     'badge-high',
  medium:   'badge-medium',
  low:      'badge-low',
}

const SEV_LABEL: Record<string, string> = {
  critical: 'Crítica',
  high:     'Alta',
  medium:   'Media',
  low:      'Baja',
}

const MALWARE_COLORS: Record<string, string> = {
  Emotet:        '#ff4444',
  Dridex:        '#ff6666',
  TrickBot:      '#ff8844',
  QakBot:        '#f0883e',
  BazarLoader:   '#e3b341',
  IcedID:        '#bc8cff',
  'Cobalt Strike':'#ff4444',
}

function getToken() { return localStorage.getItem('ids-token') ?? '' }

function StatusDot({ status }: { status: string }) {
  const online = status === 'Online'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{
        width: 8, height: 8, borderRadius: '50%',
        background: online ? '#3fb950' : '#484f58',
        boxShadow: online ? '0 0 6px #3fb950' : 'none',
        flexShrink: 0,
      }} />
      <span style={{ color: online ? '#3fb950' : 'var(--text-muted)', fontSize: '0.8rem' }}>
        {online ? 'Online' : 'Offline'}
      </span>
    </span>
  )
}

function MalwareBadge({ name }: { name: string }) {
  const color = MALWARE_COLORS[name] ?? '#8b949e'
  return (
    <span style={{
      background: color + '22', color, border: `1px solid ${color}55`,
      borderRadius: 6, padding: '2px 8px', fontSize: '0.78rem', fontWeight: 600,
      whiteSpace: 'nowrap',
    }}>
      {name}
    </span>
  )
}

export function BlacklistModule() {
  const { isAdmin } = useAuth()
  const [tab, setTab] = useState<Tab>('feodo')

  // Filtros Feodo
  const [searchFeodo, setSearchFeodo] = useState('')
  const [filterMalware, setFilterMalware] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCountry, setFilterCountry] = useState('')
  const [expandedIp, setExpandedIp] = useState<string | null>(null)

  // Formulario manual
  const [form, setForm] = useState({ ip: '', threat_type: '', description: '', severity: 'high' })
  const [saving, setSaving] = useState(false)

  const buildUrl = useCallback(() => {
    const p = new URLSearchParams()
    if (filterMalware) p.set('malware', filterMalware)
    if (filterStatus)  p.set('status',  filterStatus)
    if (filterCountry) p.set('country', filterCountry)
    if (searchFeodo)   p.set('search',  searchFeodo)
    return `/api/blacklist?${p.toString()}`
  }, [filterMalware, filterStatus, filterCountry, searchFeodo])

  const { data, loading, error, refresh } = useApi<BlacklistData>(buildUrl(), 0)

  const handleRefreshFeed = () => {
    toast.promise(
      fetch('http://localhost:8000/api/blacklist/refresh', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
      }).then(r => { if (!r.ok) throw new Error('Error'); return r.json(); }).then(refresh),
      {
        loading: '📡 Descargando feed de Feodo Tracker...',
        success: (d: any) => d?.message ?? 'Feed actualizado',
        error: 'Error al actualizar el feed',
      }
    )
  }

  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const p = apiPost('/api/blacklist', form).then(refresh)
    toast.promise(p, {
      loading: 'Guardando...',
      success: `${form.ip} agregado a la lista negra`,
      error: (err) => `Error: ${(err as Error).message}`,
    })
    p.then(() => setForm({ ip: '', threat_type: '', description: '', severity: 'high' }))
      .finally(() => setSaving(false))
  }

  const handleDeleteManual = (ip: string) => {
    toast.warning(`¿Eliminar ${ip} de la lista negra manual?`, {
      action: {
        label: 'Eliminar',
        onClick: () => toast.promise(
          apiDelete(`/api/blacklist/${encodeURIComponent(ip)}`).then(refresh),
          { loading: 'Eliminando...', success: `${ip} eliminado`, error: (e) => `Error: ${(e as Error).message}` }
        ),
      },
      cancel: { label: 'Cancelar', onClick: () => {} },
      duration: 8000,
    })
  }

  const stats = data?.stats
  const feed  = data?.feed ?? []
  const manual = data?.manual ?? []

  return (
    <div className="view-content">
      <div className="view-header">
        <div>
          <h1>Lista Negra</h1>
          <p className="view-sub">
            IPs maliciosas de Feodo Tracker (abuse.ch) — botnets C2 activos en tiempo real
          </p>
        </div>
        {isAdmin && (
          <button className="btn btn-ghost" onClick={handleRefreshFeed}>
            <RefreshCw size={15} /> Actualizar feed
          </button>
        )}
      </div>

      {/* ── Estadísticas ── */}
      {stats && (
        <div className="scan-summary mb-4" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div className="scan-stat scan-stat--danger">
            <span className="scan-stat-num">{stats.total_feed.toLocaleString()}</span>
            <span className="scan-stat-label">IPs bloqueadas (feed)</span>
          </div>
          <div className="scan-stat" style={{ '--accent': '#3fb950' } as React.CSSProperties}>
            <span className="scan-stat-num" style={{ color: '#3fb950' }}>{stats.online}</span>
            <span className="scan-stat-label">C2 activos (Online)</span>
          </div>
          <div className="scan-stat">
            <span className="scan-stat-num" style={{ color: '#8b949e' }}>{stats.offline}</span>
            <span className="scan-stat-label">Offline / histórico</span>
          </div>
          <div className="scan-stat">
            <span className="scan-stat-num">{stats.total_manual}</span>
            <span className="scan-stat-label">Entradas manuales</span>
          </div>
          {stats.fetched_at && (
            <div className="scan-stat" style={{ marginLeft: 'auto' }}>
              <span className="scan-stat-num" style={{ fontSize: '0.78rem', fontWeight: 400 }}>
                {new Date(stats.fetched_at).toLocaleString('es-MX')}
              </span>
              <span className="scan-stat-label">Último fetch</span>
            </div>
          )}
        </div>
      )}

      {/* ── Familias de malware ── */}
      {stats && stats.malware_families.length > 0 && (
        <div className="card mb-4" style={{ padding: '14px 20px' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="muted" style={{ fontSize: '0.8rem', marginRight: 4 }}>
              <AlertTriangle size={13} style={{ verticalAlign: 'middle' }} /> Familias detectadas:
            </span>
            {stats.malware_families.map(([name, count]) => (
              <button
                key={name}
                onClick={() => setFilterMalware(filterMalware === name ? '' : name)}
                style={{
                  background: (MALWARE_COLORS[name] ?? '#8b949e') + (filterMalware === name ? '33' : '11'),
                  color: MALWARE_COLORS[name] ?? '#8b949e',
                  border: `1px solid ${(MALWARE_COLORS[name] ?? '#8b949e')}${filterMalware === name ? '' : '44'}`,
                  borderRadius: 6, padding: '3px 10px', fontSize: '0.78rem', cursor: 'pointer',
                  fontWeight: filterMalware === name ? 700 : 400,
                }}
              >
                {name} <span style={{ opacity: 0.7 }}>({count.toLocaleString()})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="tabs">
        <button className={`tab ${tab === 'feodo' ? 'tab-active' : ''}`} onClick={() => setTab('feodo')}>
          <ShieldX size={14} style={{ display: 'inline', marginRight: 6 }} />
          Feodo Tracker ({stats?.total_feed.toLocaleString() ?? '…'})
        </button>
        <button className={`tab ${tab === 'manual' ? 'tab-active' : ''}`} onClick={() => setTab('manual')}>
          <Plus size={14} style={{ display: 'inline', marginRight: 6 }} />
          Lista Manual ({stats?.total_manual ?? 0})
        </button>
      </div>

      {/* ════════════ TAB FEODO ════════════ */}
      {tab === 'feodo' && (
        <>
          {/* Banner informativo */}
          <div className="card mb-4" style={{
            borderLeft: '3px solid #f0883e', background: '#f0883e08', padding: '14px 18px',
          }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <Info size={16} style={{ color: '#f0883e', flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: '0.83rem', lineHeight: 1.6 }}>
                <strong style={{ color: 'var(--text-h)' }}>Feodo Tracker</strong> por abuse.ch —
                base de datos pública de servidores de Comando y Control (C2) de botnets.
                Los C2 <strong>Online</strong> son IPs activas que controlan malware en equipos infectados.
                El tráfico hacia estas IPs indica compromiso de seguridad en tu red.
              </div>
            </div>
          </div>

          {/* Filtros */}
          <div className="card mb-4" style={{ padding: '14px 18px' }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: '1 1 200px' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  className="input" placeholder="Buscar IP o malware..."
                  value={searchFeodo} onChange={e => setSearchFeodo(e.target.value)}
                  style={{ paddingLeft: 32 }}
                />
              </div>
              <select className="input" style={{ flex: '0 0 auto', width: 'auto' }}
                value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="">Estado: Todos</option>
                <option value="Online">🟢 Online</option>
                <option value="Offline">⚫ Offline</option>
              </select>
              <select className="input" style={{ flex: '0 0 auto', width: 'auto' }}
                value={filterMalware} onChange={e => setFilterMalware(e.target.value)}>
                <option value="">Malware: Todos</option>
                {stats?.malware_families.map(([name]) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              <select className="input" style={{ flex: '0 0 auto', width: 'auto' }}
                value={filterCountry} onChange={e => setFilterCountry(e.target.value)}>
                <option value="">País: Todos</option>
                {stats?.top_countries.map(([c]) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {(filterMalware || filterStatus || filterCountry || searchFeodo) && (
                <button className="btn btn-ghost" onClick={() => {
                  setFilterMalware(''); setFilterStatus(''); setFilterCountry(''); setSearchFeodo('')
                }}>
                  Limpiar filtros
                </button>
              )}
              <button className="btn-icon" onClick={refresh} title="Refrescar"><RefreshCw size={14} /></button>
            </div>
          </div>

          {loading && <div className="loading">Cargando feed de Feodo Tracker...</div>}
          {error && (
            <div className="msg msg-error">
              Error de conexión: {error}<br />
              <span style={{ fontSize: '0.82rem', opacity: .8 }}>
                Verifica que el backend esté corriendo con <code>sudo python3 main.py</code>
              </span>
            </div>
          )}

          {feed.length === 0 && !loading && !error && (
            <div className="card">
              <div className="empty-msg">
                <ShieldX size={32} style={{ opacity: 0.3 }} /><br />
                No se encontraron IPs con los filtros actuales.
              </div>
            </div>
          )}

          {feed.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3>IPs bloqueadas — Feodo Tracker</h3>
                <span className="pill">{feed.length.toLocaleString()} resultados</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Estado</th>
                      <th>IP</th>
                      <th>Puerto</th>
                      <th>Malware</th>
                      <th>País</th>
                      <th>Severidad</th>
                      <th>Último visto</th>
                      <th>Info</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feed.map(entry => (
                      <>
                        <tr
                          key={entry.ip}
                          style={{ cursor: 'pointer' }}
                          className={entry.status === 'Online' ? 'row-danger' : ''}
                          onClick={() => setExpandedIp(expandedIp === entry.ip ? null : entry.ip)}
                        >
                          <td><StatusDot status={entry.status} /></td>
                          <td><code style={{ fontSize: '0.85rem' }}>{entry.ip}</code></td>
                          <td>
                            {entry.port
                              ? <code className="muted" style={{ fontSize: '0.8rem' }}>{entry.port}</code>
                              : <span className="muted">—</span>
                            }
                          </td>
                          <td><MalwareBadge name={entry.malware} /></td>
                          <td>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <Globe size={12} style={{ color: 'var(--text-muted)' }} />
                              <span style={{ fontSize: '0.82rem' }}>{entry.country}</span>
                            </span>
                          </td>
                          <td>
                            <span className={SEV_BADGE[entry.severity] ?? 'badge-high'}>
                              {SEV_LABEL[entry.severity] ?? entry.severity}
                            </span>
                          </td>
                          <td className="muted" style={{ fontSize: '0.78rem' }}>
                            {entry.last_seen
                              ? new Date(entry.last_seen).toLocaleDateString('es-MX')
                              : '—'
                            }
                          </td>
                          <td>
                            <Info size={14} style={{ color: 'var(--text-muted)', cursor: 'pointer' }} />
                          </td>
                        </tr>
                        {expandedIp === entry.ip && (
                          <tr key={`${entry.ip}-detail`}>
                            <td colSpan={8} style={{ padding: 0 }}>
                              <div style={{
                                background: 'var(--bg-card)', borderLeft: `3px solid ${entry.color}`,
                                padding: '12px 18px', margin: '0 0 2px', lineHeight: 1.7,
                              }}>
                                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 8 }}>
                                  <div>
                                    <span className="muted" style={{ fontSize: '0.75rem' }}>Primera vez visto</span>
                                    <div style={{ fontSize: '0.85rem' }}>
                                      {entry.first_seen ? new Date(entry.first_seen).toLocaleString('es-MX') : '—'}
                                    </div>
                                  </div>
                                  <div>
                                    <span className="muted" style={{ fontSize: '0.75rem' }}>Último reporte</span>
                                    <div style={{ fontSize: '0.85rem' }}>
                                      {entry.last_seen ? new Date(entry.last_seen).toLocaleString('es-MX') : '—'}
                                    </div>
                                  </div>
                                  <div>
                                    <span className="muted" style={{ fontSize: '0.75rem' }}>Fuente</span>
                                    <div style={{ fontSize: '0.85rem' }}>
                                      <a href="https://feodotracker.abuse.ch" target="_blank" rel="noreferrer"
                                        style={{ color: 'var(--accent)' }}>
                                        abuse.ch / Feodo Tracker
                                      </a>
                                    </div>
                                  </div>
                                </div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-body)' }}>
                                  <strong style={{ color: entry.color }}>¿Por qué es peligrosa?</strong>{' '}
                                  {entry.description}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ padding: '10px 18px', fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
                Haz clic en cualquier fila para ver el detalle. Feed de{' '}
                <a href="https://feodotracker.abuse.ch" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>
                  Feodo Tracker / abuse.ch
                </a>
                {' '}— actualización automática cada 6 horas.
              </div>
            </div>
          )}
        </>
      )}

      {/* ════════════ TAB MANUAL ════════════ */}
      {tab === 'manual' && (
        <>
          {isAdmin ? (
            <div className="card mb-4">
              <div className="card-header"><h3><Plus size={16} /> Agregar IP a Lista Negra</h3></div>
              <form className="form-grid" onSubmit={handleAddManual}>
                <div className="form-group">
                  <label>Dirección IP *</label>
                  <input className="input" placeholder="203.0.113.1" value={form.ip}
                    onChange={e => setForm(f => ({ ...f, ip: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Tipo de amenaza *</label>
                  <input className="input" placeholder="Ransomware, Phishing, Botnet C2..."
                    value={form.threat_type}
                    onChange={e => setForm(f => ({ ...f, threat_type: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Severidad</label>
                  <select className="input" value={form.severity}
                    onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}>
                    <option value="critical">🔴 Crítica</option>
                    <option value="high">🟠 Alta</option>
                    <option value="medium">🟡 Media</option>
                    <option value="low">🟢 Baja</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Descripción / motivo</label>
                  <input className="input" placeholder="Por qué esta IP es peligrosa..."
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="form-group form-action">
                  <button className="btn btn-primary" type="submit" disabled={saving}>
                    <Plus size={16} /> {saving ? 'Guardando...' : 'Agregar a lista negra'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="msg msg-info mb-4">
              Solo los administradores pueden agregar entradas manuales a la lista negra.
            </div>
          )}

          <div className="card">
            <div className="card-header">
              <h3>Entradas Manuales</h3>
              <span className="pill">{manual.length} entradas</span>
            </div>
            {manual.length === 0 ? (
              <div className="empty-msg">
                No hay entradas manuales. Agrega IPs sospechosas detectadas en tu red.
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>IP</th><th>Tipo de amenaza</th><th>Severidad</th>
                      <th>Descripción</th><th>Agregado</th>
                      {isAdmin && <th>Acción</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {manual.map((entry: ManualBlacklistEntry) => (
                      <tr key={entry.ip}>
                        <td><code>{entry.ip}</code></td>
                        <td>
                          <span className="pill" style={{ color: 'var(--text-h)' }}>
                            {entry.threat_type}
                          </span>
                        </td>
                        <td>
                          <span className={SEV_BADGE[entry.severity] ?? 'badge-high'}>
                            {SEV_LABEL[entry.severity] ?? entry.severity}
                          </span>
                        </td>
                        <td className="muted" style={{ fontSize: '0.82rem', maxWidth: 300 }}>
                          {entry.description || '—'}
                        </td>
                        <td className="muted" style={{ fontSize: '0.78rem' }}>
                          {new Date(entry.added_at).toLocaleString('es-MX')}
                        </td>
                        {isAdmin && (
                          <td>
                            <button className="btn-icon danger" onClick={() => handleDeleteManual(entry.ip)}
                              title="Eliminar">
                              <Trash2 size={14} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Información sobre recursos de referencia */}
          <div className="card mt-4" style={{ borderLeft: '3px solid var(--accent)' }}>
            <div className="card-header">
              <h3><Globe size={15} /> Recursos de Inteligencia Pública</h3>
            </div>
            <div style={{ padding: '0 20px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
              {[
                { name: 'Feodo Tracker', url: 'https://feodotracker.abuse.ch', desc: 'Botnet C2 — Emotet, Dridex, TrickBot' },
                { name: 'AbuseIPDB', url: 'https://www.abuseipdb.com', desc: 'Reporte y consulta de IPs abusivas' },
                { name: 'Shodan', url: 'https://www.shodan.io', desc: 'Motor de búsqueda para dispositivos expuestos' },
                { name: 'VirusTotal', url: 'https://www.virustotal.com', desc: 'Análisis de IPs, URLs y archivos maliciosos' },
                { name: 'MalwareBazaar', url: 'https://bazaar.abuse.ch', desc: 'Repositorio de muestras de malware' },
                { name: 'URLhaus', url: 'https://urlhaus.abuse.ch', desc: 'URLs de distribución de malware' },
              ].map(r => (
                <a key={r.name} href={r.url} target="_blank" rel="noreferrer"
                  style={{
                    display: 'block', background: 'var(--bg-card-hover)',
                    border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px',
                    textDecoration: 'none', transition: 'border-color .15s',
                  }}>
                  <div style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '0.88rem', marginBottom: 4 }}>
                    {r.name} ↗
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{r.desc}</div>
                </a>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
