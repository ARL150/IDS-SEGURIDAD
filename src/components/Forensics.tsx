import { useState } from 'react'
import { Search, RefreshCw, ExternalLink, Mail, Trash2, Trash } from 'lucide-react'
import { toast } from 'sonner'
import { useApi, apiPost, apiDelete } from '../hooks/useApi'
import { useAuth } from '../contexts/AuthContext'
import type { ForensicReport } from '../types'

export function Forensics() {
  const { isAdmin } = useAuth()
  const { data: reports, loading, error, refresh } = useApi<ForensicReport[]>('/api/forensics', 10000)
  const [ip, setIp] = useState('')
  const [type, setType] = useState('Desconocido')
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<ForensicReport | null>(null)

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault()
    setAnalyzing(true)
    setResult(null)
    const p = apiPost<ForensicReport>(
      `/api/forensics/${encodeURIComponent(ip)}?threat_type=${encodeURIComponent(type)}`
    ).then(data => { setResult(data); refresh(); return data })
    toast.promise(p, {
      loading: `🔍 Consultando WHOIS y AbuseIPDB para ${ip}...`,
      success: (d) => `Reporte forense generado para ${(d as ForensicReport).ip}`,
      error: (err) => `Error: ${(err as Error).message}`,
    })
    p.finally(() => setAnalyzing(false))
  }

  const handleDeleteOne = (reportIp: string) => {
    toast.warning(`¿Eliminar el reporte de ${reportIp}?`, {
      action: {
        label: 'Eliminar',
        onClick: () => {
          toast.promise(
            apiDelete(`/api/forensics/${encodeURIComponent(reportIp)}`).then(refresh),
            { loading: 'Eliminando...', success: 'Reporte eliminado', error: (e) => `Error: ${(e as Error).message}` }
          )
        },
      },
      cancel: { label: 'Cancelar', onClick: () => {} },
      duration: 7000,
    })
  }

  const handleClearAll = () => {
    toast.warning(`¿Eliminar TODOS los reportes forenses (${reports?.length ?? 0})?`, {
      action: {
        label: 'Limpiar todo',
        onClick: () => {
          toast.promise(
            apiDelete('/api/forensics').then(refresh),
            { loading: 'Limpiando...', success: 'Todos los reportes eliminados', error: (e) => `Error: ${(e as Error).message}` }
          )
        },
      },
      cancel: { label: 'Cancelar', onClick: () => {} },
      duration: 8000,
    })
  }

  return (
    <div className="view-content">
      <div className="view-header">
        <div>
          <h1>Automatización Forense</h1>
          <p className="view-sub">Consulta WHOIS / AbuseIPDB y genera reporte de contacto de abuso</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={refresh}><RefreshCw size={16} /> Actualizar</button>
          {isAdmin && (reports?.length ?? 0) > 0 && (
            <button className="btn btn-ghost" onClick={handleClearAll} style={{ color: 'var(--danger)' }}>
              <Trash size={16} /> Limpiar todo
            </button>
          )}
        </div>
      </div>

      {/* ── Formulario de análisis ── */}
      <div className="card mb-4">
        <div className="card-header"><h3><Search size={16} /> Analizar IP</h3></div>
        <form className="form-grid" onSubmit={handleAnalyze}>
          <div className="form-group">
            <label>Dirección IP a analizar *</label>
            <input className="input" placeholder="1.2.3.4" value={ip}
              onChange={e => setIp(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Tipo de Amenaza</label>
            <input className="input" placeholder="Botnet, Malware C2, Phishing..." value={type}
              onChange={e => setType(e.target.value)} />
          </div>
          <div className="form-group form-action">
            <button className="btn btn-primary" type="submit" disabled={analyzing}>
              <Search size={16} /> {analyzing ? 'Analizando...' : 'Ejecutar análisis forense'}
            </button>
          </div>
        </form>

        {result && (
          <div className="forensic-result">
            <h4>Resultado para <code>{result.ip}</code></h4>
            <div className="forensic-grid">
              <div><label>Hostname</label><code>{result.hostname}</code></div>
              <div><label>Organización</label><span>{result.org}</span></div>
              <div><label>País</label><span>{result.country}</span></div>
              <div><label>ASN</label><code>{result.asn}</code></div>
              <div><label>ISP</label><span>{result.isp || '—'}</span></div>
              {result.abuse_score !== undefined && (
                <div><label>Abuse Score</label>
                  <span className={`sev ${result.abuse_score > 50 ? 'sev-critical' : 'sev-medium'}`}>
                    {result.abuse_score}%
                  </span>
                </div>
              )}
              <div><label>Total reportes</label><span>{result.total_reports}</span></div>
              <div><label>Email enviado</label><span>{result.email_sent ? '✅' : '❌'}</span></div>
            </div>
            {result.abuse_email !== 'N/A' && (
              <a href={`mailto:${result.abuse_email}`} className="btn btn-primary mt-2"
                style={{ display: 'inline-flex', gap: 8 }}
                onClick={() => toast.info(`Abriendo cliente de correo para ${result.abuse_email}`)}>
                <Mail size={16} /> Reportar abuso a {result.abuse_email}
              </a>
            )}
          </div>
        )}
      </div>

      {loading && <div className="loading">Cargando reportes...</div>}
      {error && <div className="msg msg-error">Error de conexión: {error}</div>}

      {/* ── Tabla de reportes ── */}
      <div className="card">
        <div className="card-header">
          <h3>Reportes Forenses Generados</h3>
          <span className="pill">{reports?.length ?? 0} reportes</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>IP</th>
                <th>Amenaza</th>
                <th>Organización</th>
                <th>País</th>
                <th>Contacto Abuso</th>
                <th>Score</th>
                <th>Analizado</th>
                {isAdmin && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {(reports ?? []).map(r => (
                <tr key={r.ip}>
                  <td><code className="text-danger">{r.ip}</code></td>
                  <td>{r.threat_type}</td>
                  <td>{r.org}</td>
                  <td>{r.country}</td>
                  <td>
                    {r.abuse_email !== 'N/A'
                      ? <a href={`mailto:${r.abuse_email}`} className="link">
                          <ExternalLink size={12} /> {r.abuse_email}
                        </a>
                      : <span className="muted">N/A</span>
                    }
                  </td>
                  <td>
                    {r.abuse_score !== undefined
                      ? <span className={`sev ${r.abuse_score > 50 ? 'sev-critical' : 'sev-low'}`}>
                          {r.abuse_score}%
                        </span>
                      : '—'}
                  </td>
                  <td className="muted">{new Date(r.analyzed_at).toLocaleString('es-MX')}</td>
                  {isAdmin && (
                    <td>
                      <button className="btn-icon danger" onClick={() => handleDeleteOne(r.ip)}
                        title="Eliminar reporte">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {!reports?.length && !loading && (
                <tr><td colSpan={isAdmin ? 8 : 7} className="empty-row">
                  Sin reportes forenses. Analiza una IP para generar uno.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
