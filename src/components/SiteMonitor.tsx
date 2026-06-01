import { Globe, RefreshCw, BarChart2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useApi } from '../hooks/useApi'
import type { DomainVisit, TopDomain } from '../types'

interface DomainsResponse {
  recent: DomainVisit[]
  top: TopDomain[]
  stats: { total_queries: number; unique_domains: number }
}

const TYPE_COLOR: Record<string, string> = {
  DNS: 'var(--accent)',
  HTTP: '#e3b341',
  HTTPS: '#3fb950',
}

export function SiteMonitor() {
  const { data, loading, error, refresh } = useApi<DomainsResponse>('/api/domains', 4000)

  const top = data?.top ?? []
  const recent = data?.recent ?? []

  return (
    <div className="view-content">
      <div className="view-header">
        <div>
          <h1>Monitoreo de Sitios</h1>
          <p className="view-sub">Registro de consultas DNS y tráfico HTTP en tiempo real</p>
        </div>
        <button className="btn btn-ghost" onClick={refresh}><RefreshCw size={16} /> Actualizar</button>
      </div>

      <div className="stats-mini">
        <div className="mini-card">
          <Globe size={20} />
          <div>
            <div className="mini-val">{data?.stats.total_queries.toLocaleString() ?? 0}</div>
            <div className="mini-label">Consultas totales</div>
          </div>
        </div>
        <div className="mini-card">
          <BarChart2 size={20} />
          <div>
            <div className="mini-val">{data?.stats.unique_domains ?? 0}</div>
            <div className="mini-label">Dominios únicos</div>
          </div>
        </div>
      </div>

      {loading && <div className="loading">Cargando datos de dominios...</div>}
      {error && <div className="msg msg-error">Error de conexión: {error}</div>}

      <div className="card">
        <div className="card-header"><h3>Top 20 Dominios Más Visitados</h3></div>
        {top.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={top} layout="vertical" margin={{ left: 160 }}>
              <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <YAxis type="category" dataKey="domain" width={160} tick={{ fill: 'var(--text)', fontSize: 12 }} />
              <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }} />
              <Bar dataKey="count" name="Consultas">
                {top.map((_, i) => (
                  <Cell key={i} fill={`hsl(${200 + i * 6}, 70%, 55%)`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="empty-msg">Sin datos de dominios aún. Inicia la captura para registrar tráfico DNS/HTTP.</p>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Consultas Recientes</h3>
          <span className="pill">{recent.length} registros</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Dominio</th>
                <th>IP Origen</th>
                <th>Tipo</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((v, i) => (
                <tr key={i}>
                  <td className="muted">{new Date(v.timestamp).toLocaleTimeString('es-MX')}</td>
                  <td><code>{v.domain}</code></td>
                  <td><code>{v.source_ip}</code></td>
                  <td>
                    <span className="pill" style={{ background: TYPE_COLOR[v.type] + '33', color: TYPE_COLOR[v.type] }}>
                      {v.type}
                    </span>
                  </td>
                </tr>
              ))}
              {!recent.length && !loading && (
                <tr><td colSpan={4} className="empty-row">Sin consultas DNS registradas. Inicia la captura.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
