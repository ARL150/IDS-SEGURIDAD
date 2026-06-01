import { Bell, RefreshCw, Mail, MailX } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import type { Alert } from '../types'

const SEV_CLASS: Record<string, string> = {
  critical: 'sev-critical',
  danger: 'sev-high',
  warning: 'sev-medium',
  info: 'sev-low',
}

const TYPE_LABEL: Record<string, string> = {
  whitelist: 'Lista Blanca',
  threat: 'Amenaza',
  forensic: 'Forense',
  info: 'Info',
}

export function AlertLog() {
  const { data: alerts, loading, error, refresh } = useApi<Alert[]>('/api/alerts?limit=200', 5000)

  return (
    <div className="view-content">
      <div className="view-header">
        <div>
          <h1>Registro de Alertas</h1>
          <p className="view-sub">Historial completo de alertas generadas por el IDS</p>
        </div>
        <button className="btn btn-ghost" onClick={refresh}><RefreshCw size={16} /> Actualizar</button>
      </div>

      <div className="stats-mini">
        <div className="mini-card">
          <Bell size={20} />
          <div>
            <div className="mini-val">{alerts?.length ?? 0}</div>
            <div className="mini-label">Total alertas</div>
          </div>
        </div>
        <div className="mini-card accent-green">
          <Mail size={20} />
          <div>
            <div className="mini-val">{alerts?.filter(a => a.email_sent).length ?? 0}</div>
            <div className="mini-label">Emails enviados</div>
          </div>
        </div>
        <div className="mini-card accent-red">
          <MailX size={20} />
          <div>
            <div className="mini-val">{alerts?.filter(a => !a.email_sent).length ?? 0}</div>
            <div className="mini-label">Emails fallidos</div>
          </div>
        </div>
      </div>

      {loading && <div className="loading">Cargando alertas...</div>}
      {error && <div className="msg msg-error">Error de conexión: {error}</div>}

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Tipo</th>
                <th>Severidad</th>
                <th>Mensaje</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              {(alerts ?? []).map(a => (
                <tr key={a.id} className={a.severity === 'critical' || a.severity === 'danger' ? 'row-danger' : ''}>
                  <td className="muted">{new Date(a.timestamp).toLocaleString('es-MX')}</td>
                  <td><span className="pill">{TYPE_LABEL[a.type] ?? a.type}</span></td>
                  <td><span className={`sev ${SEV_CLASS[a.severity]}`}>{a.severity.toUpperCase()}</span></td>
                  <td>{a.message}</td>
                  <td>{a.email_sent ? <span className="text-ok">Enviado</span> : <span className="muted">—</span>}</td>
                </tr>
              ))}
              {!alerts?.length && !loading && (
                <tr><td colSpan={5} className="empty-row">Sin alertas registradas. El sistema está en calma.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
