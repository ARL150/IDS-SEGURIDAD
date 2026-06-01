import { useState } from 'react'
import { Activity, RefreshCw, Trash2, Pause, Play, Filter } from 'lucide-react'
import { toast } from 'sonner'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useApi, apiDelete } from '../hooks/useApi'
import { useAuth } from '../contexts/AuthContext'

interface Packet {
  no: number
  timestamp: string
  src_ip: string
  dst_ip: string
  src_mac: string
  protocol: string
  length: number
  info: string
  flagged: boolean
}

const PROTO_COLOR: Record<string, string> = {
  DNS:   '#58a6ff',
  HTTP:  '#3fb950',
  HTTPS: '#2ea043',
  TCP:   '#e3b341',
  UDP:   '#d29922',
  ICMP:  '#f78166',
  SSH:   '#bc8cff',
  ARP:   '#79c0ff',
  DHCP:  '#ffa657',
  SMTP:  '#ff7b72',
  FTP:   '#ff7b72',
  NTP:   '#8b949e',
  OTHER: '#484f58',
}

const PROTOCOLS = ['', 'DNS', 'HTTP', 'HTTPS', 'TCP', 'UDP', 'ICMP', 'ARP', 'SSH', 'DHCP']

export function PacketMonitor() {
  const { isAdmin } = useAuth()
  const [paused, setPaused] = useState(false)
  const [filter, setFilter] = useState('')
  const [search, setSearch] = useState('')

  const endpoint = filter ? `/api/packets?limit=300&protocol=${filter}` : '/api/packets?limit=300'
  const { data: packets, loading, error, refresh } = useApi<Packet[]>(
    endpoint, paused ? 0 : 2000
  )

  // Distribución de protocolos para la gráfica
  const protoDist = Object.entries(
    (packets ?? []).reduce<Record<string, number>>((acc, p) => {
      acc[p.protocol] = (acc[p.protocol] ?? 0) + 1
      return acc
    }, {})
  )
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  const visible = (packets ?? []).filter(p => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      p.src_ip.includes(q) || p.dst_ip.includes(q) ||
      p.protocol.toLowerCase().includes(q) || p.info.toLowerCase().includes(q)
    )
  })

  const handleClear = () => {
    toast.warning('¿Limpiar el log de paquetes?', {
      action: {
        label: 'Limpiar',
        onClick: () => {
          toast.promise(apiDelete('/api/packets').then(refresh), {
            loading: 'Limpiando...', success: 'Log de paquetes limpiado', error: 'Error al limpiar',
          })
        },
      },
      cancel: { label: 'Cancelar', onClick: () => {} },
      duration: 6000,
    })
  }

  return (
    <div className="view-content">
      <div className="view-header">
        <div>
          <h1>Monitor de Tráfico</h1>
          <p className="view-sub">Captura de paquetes en tiempo real — estilo Wireshark</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => setPaused(v => !v)}>
            {paused ? <Play size={16} /> : <Pause size={16} />}
            {paused ? 'Reanudar' : 'Pausar'}
          </button>
          <button className="btn btn-ghost" onClick={refresh}>
            <RefreshCw size={16} /> Actualizar
          </button>
          {isAdmin && (
            <button className="btn btn-ghost" onClick={handleClear}>
              <Trash2 size={16} /> Limpiar
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="alert-banner warning">
          ⚠️ {error === 'Sesión expirada' ? 'Sesión expirada' : `Error: ${error}`}
        </div>
      )}

      {/* ── Gráfica de protocolos ── */}
      {protoDist.length > 0 && (
        <div className="card mb-4">
          <div className="card-header">
            <h3><Activity size={16} /> Distribución de Protocolos</h3>
            <span className="pill">{packets?.length ?? 0} paquetes</span>
          </div>
          <div style={{ padding: '12px 20px 16px' }}>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={protoDist} barSize={32}>
                <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} width={36} />
                <Tooltip
                  contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}
                  cursor={{ fill: 'var(--surface2)' }}
                />
                <Bar dataKey="count" name="Paquetes" radius={[4, 4, 0, 0]}>
                  {protoDist.map((entry) => (
                    <Cell key={entry.name} fill={PROTO_COLOR[entry.name] ?? '#484f58'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Filtros ── */}
      <div className="packet-toolbar">
        <div className="packet-search">
          <Filter size={15} />
          <input
            className="input"
            placeholder="Buscar por IP, protocolo, info..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--text)' }}
          />
        </div>
        <div className="proto-filters">
          {PROTOCOLS.map(p => (
            <button
              key={p}
              className={`proto-btn ${filter === p ? 'proto-btn--active' : ''}`}
              onClick={() => setFilter(p)}
              style={filter === p && p ? { borderColor: PROTO_COLOR[p], color: PROTO_COLOR[p] } : {}}
            >
              {p || 'Todos'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tabla de paquetes ── */}
      <div className="card">
        {loading && <div className="loading">Esperando paquetes...</div>}
        {!loading && visible.length === 0 && (
          <div className="empty-msg">
            {(packets?.length ?? 0) === 0
              ? '📡 Sin paquetes capturados. Inicia la captura desde el Dashboard.'
              : 'Sin resultados para el filtro aplicado.'}
          </div>
        )}
        {visible.length > 0 && (
          <div className="table-wrap packet-table-wrap">
            <table className="packet-table">
              <thead>
                <tr>
                  <th style={{ width: 52 }}>#</th>
                  <th style={{ width: 80 }}>Tiempo</th>
                  <th>IP Origen</th>
                  <th>IP Destino</th>
                  <th style={{ width: 72 }}>Proto</th>
                  <th style={{ width: 52 }}>Bytes</th>
                  <th>Info</th>
                </tr>
              </thead>
              <tbody>
                {visible.slice(0, 200).map(pkt => (
                  <tr
                    key={pkt.no}
                    className={pkt.flagged ? 'pkt-flagged' : `pkt-${pkt.protocol.toLowerCase()}`}
                  >
                    <td className="pkt-no">{pkt.no}</td>
                    <td className="pkt-time muted">
                      {new Date(pkt.timestamp).toLocaleTimeString('es-MX', { hour12: false })}
                    </td>
                    <td><code className={pkt.flagged ? 'text-danger' : ''}>{pkt.src_ip}</code></td>
                    <td><code>{pkt.dst_ip}</code></td>
                    <td>
                      <span
                        className="proto-tag"
                        style={{
                          background: (PROTO_COLOR[pkt.protocol] ?? '#484f58') + '22',
                          color: PROTO_COLOR[pkt.protocol] ?? '#8b949e',
                          borderColor: (PROTO_COLOR[pkt.protocol] ?? '#484f58') + '55',
                        }}
                      >
                        {pkt.protocol}
                      </span>
                    </td>
                    <td className="muted pkt-len">{pkt.length}</td>
                    <td className="pkt-info muted">{pkt.info}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {paused && (
        <div style={{ textAlign: 'center', padding: '12px', color: 'var(--warning)', fontSize: '0.82rem' }}>
          ⏸ Actualización pausada — los paquetes siguen capturándose en el backend
        </div>
      )}
    </div>
  )
}
