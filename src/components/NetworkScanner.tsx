import { useState, useEffect } from 'react'
import { Radar, Shield, ShieldOff, Plus, RefreshCw, List, LayoutGrid } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '../contexts/AuthContext'
import { apiPost } from '../hooks/useApi'

interface ScanDevice {
  ip: string
  mac: string
  hostname: string
  authorized: boolean
  label: string
  vendor: string
  device_type: string
  emoji: string
  type_label: string
}

interface ScanStatus { scanning: boolean; last_run: string | null; network: string }
interface ScanResult  { devices: ScanDevice[]; status: ScanStatus }

function getToken() { return localStorage.getItem('ids-token') ?? '' }

const TYPE_COLOR: Record<string, string> = {
  phone:   '#58a6ff',
  laptop:  '#3fb950',
  desktop: '#3fb950',
  router:  '#f0883e',
  ap:      '#f0883e',
  iot:     '#bc8cff',
  tv:      '#79c0ff',
  gaming:  '#e3b341',
  printer: '#8b949e',
  server:  '#ff7b72',
  vm:      '#d2a8ff',
  unknown: '#484f58',
}

export function NetworkScanner() {
  const { isAdmin } = useAuth()
  const [result, setResult]   = useState<ScanResult | null>(null)
  const [scanning, setScanning] = useState(false)
  const [view, setView]       = useState<'grid' | 'table'>('grid')
  const [filter, setFilter]   = useState<'all' | 'authorized' | 'unknown'>('all')

  const fetchResults = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/network/scan', {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (res.ok) {
        const data: ScanResult = await res.json()
        setResult(data)
        if (!data.status.scanning) setScanning(false)
      }
    } catch { /* sin conexión */ }
  }

  useEffect(() => { fetchResults() }, [])

  useEffect(() => {
    if (!scanning) return
    const id = setInterval(fetchResults, 2000)
    return () => clearInterval(id)
  }, [scanning])

  const handleScan = async () => {
    setScanning(true)
    const p = apiPost('/api/network/scan')
    toast.promise(p, {
      loading: '📡 Escaneando dispositivos en la red local...',
      success: 'Escaneo ARP iniciado — espera unos segundos',
      error: (e) => `Error: ${(e as Error).message}`,
    })
    p.catch(() => setScanning(false))
  }

  const handleAuthorize = (dev: ScanDevice) => {
    const p = apiPost('/api/whitelist', {
      ip: dev.ip, mac: dev.mac,
      label: dev.type_label || dev.hostname || dev.vendor || '',
      authorized: true,
    }).then(fetchResults)
    toast.promise(p, {
      loading: 'Autorizando...', success: `${dev.ip} agregado a la lista blanca`,
      error: (e) => `Error: ${(e as Error).message}`,
    })
  }

  const all     = result?.devices ?? []
  const visible = all.filter(d =>
    filter === 'all'        ? true :
    filter === 'authorized' ? d.authorized :
    !d.authorized
  )

  const byType = all.reduce<Record<string, number>>((acc, d) => {
    acc[d.device_type] = (acc[d.device_type] ?? 0) + 1
    return acc
  }, {})

  return (
    <div>
      {/* ── Header ── */}
      <div className="card mb-4">
        <div className="card-header">
          <h3><Radar size={16} /> Escáner ARP — Dispositivos en la Red</h3>
          <div style={{ display: 'flex', gap: 6 }}>
            {result?.status.last_run && (
              <span className="muted" style={{ fontSize: '0.73rem', alignSelf: 'center' }}>
                Actualizado: {new Date(result.status.last_run).toLocaleTimeString('es-MX')}
              </span>
            )}
            <button className="btn-icon" onClick={fetchResults} title="Refrescar"><RefreshCw size={14} /></button>
          </div>
        </div>

        {/* Contadores */}
        <div className="scan-summary">
          <div className="scan-stat">
            <span className="scan-stat-num">{all.length}</span>
            <span className="scan-stat-label">Total detectados</span>
          </div>
          <div className="scan-stat scan-stat--ok">
            <span className="scan-stat-num">{all.filter(d => d.authorized).length}</span>
            <span className="scan-stat-label">Autorizados</span>
          </div>
          <div className="scan-stat scan-stat--danger">
            <span className="scan-stat-num">{all.filter(d => !d.authorized).length}</span>
            <span className="scan-stat-label">Sin autorizar</span>
          </div>
          {result?.status.network && (
            <div className="scan-stat">
              <span className="scan-stat-num" style={{ fontSize: '1rem' }}>{result.status.network}</span>
              <span className="scan-stat-label">Segmento de red</span>
            </div>
          )}

          {/* Mini distribución por tipo */}
          {Object.entries(byType).length > 0 && (
            <div className="scan-type-pills">
              {Object.entries(byType).map(([type, count]) => (
                <span key={type} className="scan-type-pill"
                  style={{ borderColor: TYPE_COLOR[type] ?? '#484f58', color: TYPE_COLOR[type] ?? '#8b949e' }}>
                  {count} {type}
                </span>
              ))}
            </div>
          )}
        </div>

        <div style={{ padding: '0 20px 16px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className={`btn ${scanning ? 'btn-ghost' : 'btn-primary'}`} onClick={handleScan} disabled={scanning}>
            <Radar size={16} />
            {scanning ? 'Escaneando...' : 'Escanear red ahora'}
          </button>

          {scanning && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="scan-pulse" />
              <span className="muted" style={{ fontSize: '0.82rem' }}>Enviando ARP a {result?.status.network || 'red local'}...</span>
            </div>
          )}

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <button className={`btn-icon ${view === 'grid' ? 'btn-icon-active' : ''}`} onClick={() => setView('grid')} title="Vista tarjetas">
              <LayoutGrid size={15} />
            </button>
            <button className={`btn-icon ${view === 'table' ? 'btn-icon-active' : ''}`} onClick={() => setView('table')} title="Vista tabla">
              <List size={15} />
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div style={{ padding: '0 20px 16px', display: 'flex', gap: 6 }}>
          {(['all','authorized','unknown'] as const).map(f => (
            <button key={f} className={`proto-btn ${filter === f ? 'proto-btn--active' : ''}`} onClick={() => setFilter(f)}>
              {f === 'all' ? 'Todos' : f === 'authorized' ? '✅ Autorizados' : '⚠️ Sin autorizar'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Estado vacío ── */}
      {all.length === 0 && !scanning && (
        <div className="card">
          <div className="empty-msg">
            📡 Presiona <strong>"Escanear red ahora"</strong> para descubrir todos los dispositivos conectados.<br />
            <span style={{ fontSize: '0.78rem', opacity: .7 }}>
              Requiere <code>sudo python3 main.py</code> para acceso a la red.
            </span>
          </div>
        </div>
      )}

      {/* ── Vista tarjetas (grid) ── */}
      {visible.length > 0 && view === 'grid' && (
        <div className="device-grid">
          {visible.map(dev => (
            <div key={dev.ip} className={`device-card ${!dev.authorized ? 'device-card--danger' : ''}`}>
              <div className="device-card-top">
                <span className="device-emoji">{dev.emoji || '❓'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="device-name">
                    {dev.label || dev.hostname || dev.type_label || 'Desconocido'}
                  </div>
                  {dev.vendor && (
                    <div className="device-vendor">{dev.vendor}</div>
                  )}
                </div>
                <span
                  className="device-type-badge"
                  style={{ background: (TYPE_COLOR[dev.device_type] ?? '#484f58') + '22',
                           color: TYPE_COLOR[dev.device_type] ?? '#8b949e' }}
                >
                  {dev.type_label}
                </span>
              </div>

              <div className="device-card-body">
                <div className="device-row">
                  <span>IP</span><code>{dev.ip}</code>
                </div>
                <div className="device-row">
                  <span>MAC</span><code style={{ fontSize: '0.72rem' }}>{dev.mac}</code>
                </div>
                {dev.hostname && (
                  <div className="device-row">
                    <span>Hostname</span><span className="muted" style={{ fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dev.hostname}</span>
                  </div>
                )}
              </div>

              <div className="device-card-footer">
                {dev.authorized
                  ? <span className="badge-ok" style={{ fontSize: '0.75rem' }}><Shield size={12} /> Autorizado</span>
                  : <span className="badge-danger" style={{ fontSize: '0.75rem' }}><ShieldOff size={12} /> No autorizado</span>
                }
                {isAdmin && !dev.authorized && (
                  <button className="btn btn-ghost btn-sm" onClick={() => handleAuthorize(dev)}
                    style={{ marginLeft: 'auto', fontSize: '0.75rem', padding: '4px 10px' }}>
                    <Plus size={12} /> Autorizar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Vista tabla ── */}
      {visible.length > 0 && view === 'table' && (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Dispositivo</th><th>IP</th><th>MAC</th>
                  <th>Fabricante</th><th>Hostname</th><th>Estado</th>
                  {isAdmin && <th>Acción</th>}
                </tr>
              </thead>
              <tbody>
                {visible.map(dev => (
                  <tr key={dev.ip} className={!dev.authorized ? 'row-danger' : ''}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '1.3rem' }}>{dev.emoji}</span>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-h)' }}>
                            {dev.label || dev.type_label}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{dev.vendor}</div>
                        </div>
                      </div>
                    </td>
                    <td><code>{dev.ip}</code></td>
                    <td><code className="muted" style={{ fontSize: '0.75rem' }}>{dev.mac}</code></td>
                    <td>
                      <span className="pill" style={{ borderColor: TYPE_COLOR[dev.device_type] + '55', color: TYPE_COLOR[dev.device_type] }}>
                        {dev.device_type}
                      </span>
                    </td>
                    <td className="muted" style={{ fontSize: '0.8rem' }}>{dev.hostname || '—'}</td>
                    <td>
                      {dev.authorized
                        ? <span className="badge-ok"><Shield size={13} /> Autorizado</span>
                        : <span className="badge-danger"><ShieldOff size={13} /> No autorizado</span>
                      }
                    </td>
                    {isAdmin && (
                      <td>
                        {!dev.authorized && (
                          <button className="btn-icon success" onClick={() => handleAuthorize(dev)} title="Autorizar">
                            <Plus size={14} />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
