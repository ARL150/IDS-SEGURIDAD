import { Package, AlertTriangle, Mail, Wifi, Clock, Play, Square, X, Shield, ShieldOff, Cpu } from 'lucide-react'
import { toast } from 'sonner'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts'
import type { SystemStatus } from '../types'
import { apiPost, useApi } from '../hooks/useApi'
import { useState } from 'react'

interface Props {
  status: SystemStatus | null
  onRefresh: () => void
}

interface DeviceEntry {
  ip: string
  mac: string
  authorized: boolean
  in_whitelist: boolean
  label: string
  first_seen: string
  last_seen: string
  packets: number
  vendor?: string
  dtype?: string
  emoji?: string
  type_label?: string
}

interface TrafficPoint {
  time: string
  paquetes: number
  amenazas: number
  dispositivos: number
}

const DEVICE_COLORS: Record<string, string> = {
  phone:   '#58a6ff',
  laptop:  '#3fb950',
  desktop: '#d2a8ff',
  router:  '#e3b341',
  ap:      '#f0883e',
  iot:     '#79c0ff',
  tv:      '#ffa657',
  gaming:  '#ff7b72',
  printer: '#8b949e',
  server:  '#56d364',
  vm:      '#bc8cff',
  unknown: '#484f58',
}

const PIE_COLORS = ['#3fb950', '#f85149', '#e3b341', '#58a6ff']

function DeviceModal({ onClose }: { onClose: () => void }) {
  const { data: devices, loading } = useApi<DeviceEntry[]>('/api/devices', 5000)
  const [filter, setFilter] = useState<'all' | 'authorized' | 'unauthorized'>('all')

  const filtered = (devices ?? []).filter(d =>
    filter === 'all' ? true :
    filter === 'authorized' ? d.authorized :
    !d.authorized
  )

  const byType = Object.entries(
    (devices ?? []).reduce<Record<string, number>>((acc, d) => {
      const t = d.dtype ?? 'unknown'
      acc[t] = (acc[t] ?? 0) + 1
      return acc
    }, {})
  ).map(([name, value]) => ({ name, value }))

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Wifi size={18} style={{ color: 'var(--accent)' }} />
              Dispositivos en la Red
            </h2>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
              {(devices ?? []).length} detectados en tiempo real
            </p>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Distribución por tipo */}
        {byType.length > 0 && (
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {byType.map(({ name, value }) => (
                <span key={name} className="pill" style={{
                  background: DEVICE_COLORS[name] + '22',
                  color: DEVICE_COLORS[name],
                  border: `1px solid ${DEVICE_COLORS[name]}44`,
                  fontSize: '0.75rem',
                }}>
                  {value} {name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 8, padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
          {(['all', 'authorized', 'unauthorized'] as const).map(f => (
            <button
              key={f}
              className={`pill ${filter === f ? 'pill-active' : ''}`}
              style={{ cursor: 'pointer' }}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'Todos' : f === 'authorized' ? '✅ Autorizados' : '⚠️ No autorizados'}
            </button>
          ))}
        </div>

        <div className="modal-body">
          {loading && <div className="loading">Cargando dispositivos...</div>}
          {!loading && filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
              <Wifi size={36} style={{ opacity: 0.3, marginBottom: 12 }} />
              <p>No hay dispositivos detectados aún.<br />Inicia la captura para ver dispositivos.</p>
            </div>
          )}
          <div className="device-list">
            {filtered.map(dev => (
              <div key={dev.ip} className={`device-row ${dev.authorized ? '' : 'device-row--alert'}`}>
                <div className="device-emoji">{dev.emoji ?? '❓'}</div>
                <div className="device-info">
                  <div className="device-name">
                    {dev.label || dev.type_label || 'Dispositivo desconocido'}
                    {dev.vendor && <span className="device-vendor"> · {dev.vendor}</span>}
                  </div>
                  <div className="device-meta">
                    <code>{dev.ip}</code>
                    {dev.mac && dev.mac !== '00:00:00:00:00:00' && <code>{dev.mac}</code>}
                    <span>{dev.packets.toLocaleString()} pkts</span>
                  </div>
                </div>
                <div className="device-status">
                  {dev.authorized
                    ? <span className="pill pill-green"><Shield size={11} /> Autorizado</span>
                    : <span className="pill pill-red"><ShieldOff size={11} /> No autorizado</span>
                  }
                  {dev.in_whitelist && (
                    <span className="pill" style={{ fontSize: '0.7rem', opacity: 0.7 }}>Lista blanca</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function Dashboard({ status, onRefresh }: Props) {
  const [toggling, setToggling] = useState(false)
  const [showDevices, setShowDevices] = useState(false)
  const { data: trafficHistory } = useApi<TrafficPoint[]>('/api/traffic-history', 30000)
  const { data: devices } = useApi<DeviceEntry[]>('/api/devices', 8000)

  const toggleCapture = async () => {
    setToggling(true)
    const starting = !status?.running
    const p = apiPost(starting ? '/api/start' : '/api/stop').then(onRefresh)
    toast.promise(p, {
      loading: starting ? 'Iniciando captura de paquetes...' : 'Deteniendo captura...',
      success: starting ? '🛡️ Captura iniciada correctamente' : '⏹️ Captura detenida',
      error: (e) => `Error: ${(e as Error).message}`,
    })
    p.finally(() => setToggling(false))
  }

  // Datos para gráfica de tipos de dispositivos
  const deviceTypeData = Object.entries(
    (devices ?? []).reduce<Record<string, number>>((acc, d) => {
      const t = d.dtype ?? 'unknown'
      acc[t] = (acc[t] ?? 0) + 1
      return acc
    }, {})
  ).map(([name, value]) => ({ name, value, fill: DEVICE_COLORS[name] ?? '#484f58' }))
    .sort((a, b) => b.value - a.value)

  // Pie chart: autorizados vs no autorizados
  const authCount = (devices ?? []).filter(d => d.authorized).length
  const unauthCount = (devices ?? []).length - authCount
  const pieData = [
    { name: 'Autorizados', value: authCount || 0 },
    { name: 'No autorizados', value: unauthCount || 0 },
    { name: 'Amenazas', value: status?.threats_detected ?? 0 },
  ].filter(d => d.value > 0)

  // Usar historial real o datos de relleno si no hay aún
  const chartData = (trafficHistory && trafficHistory.length > 1)
    ? trafficHistory
    : Array.from({ length: 8 }, () => ({
        time: `—`,
        paquetes: 0,
        amenazas: 0,
        dispositivos: 0,
      }))

  const stats = [
    {
      label: 'Paquetes capturados',
      value: status?.packets_captured ?? 0,
      icon: Package,
      color: 'cyan',
      onClick: undefined,
    },
    {
      label: 'Dispositivos activos',
      value: status?.active_devices ?? 0,
      icon: Wifi,
      color: 'green',
      onClick: () => setShowDevices(true),
      hint: 'Clic para ver detalles',
    },
    {
      label: 'Amenazas detectadas',
      value: status?.threats_detected ?? 0,
      icon: AlertTriangle,
      color: 'red',
      onClick: undefined,
    },
    {
      label: 'Alertas enviadas',
      value: status?.alerts_sent ?? 0,
      icon: Mail,
      color: 'orange',
      onClick: undefined,
    },
  ]

  return (
    <div className="view-content">
      <div className="view-header">
        <div>
          <h1>Dashboard</h1>
          <p className="view-sub">Resumen del estado del sistema en tiempo real</p>
        </div>
        <button
          className={`btn ${status?.running ? 'btn-danger' : 'btn-primary'}`}
          onClick={toggleCapture}
          disabled={toggling}
        >
          {status?.running ? <Square size={16} /> : <Play size={16} />}
          {status?.running ? 'Detener captura' : 'Iniciar captura'}
        </button>
      </div>

      {!status?.scapy_available && (
        <div className="alert-banner warning">
          ⚠️ Scapy no está instalado. Instala con: <code>pip install scapy</code>
        </div>
      )}
      {status?.scapy_available && !status?.has_root && (
        <div className="alert-banner warning">
          ⚠️ El backend corre <b>sin permisos de root</b> — no puede capturar paquetes reales.<br />
          Detén el servidor y ejecútalo así: <code>sudo python3 main.py</code>
        </div>
      )}
      {status?.capture_error && (
        <div className="alert-banner warning">
          ❌ Error de captura: <b>{status.capture_error}</b>
        </div>
      )}

      {/* Tarjetas de estadísticas */}
      <div className="stats-grid">
        {stats.map(({ label, value, icon: Icon, color, onClick, hint }) => (
          <div
            key={label}
            className={`stat-card accent-${color} ${onClick ? 'stat-card--clickable' : ''}`}
            onClick={onClick}
            title={hint}
          >
            <div className="stat-icon"><Icon size={24} /></div>
            <div className="stat-body">
              <div className="stat-value">{value.toLocaleString()}</div>
              <div className="stat-label">{label}</div>
              {hint && <div className="stat-hint">{hint}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Gráficas principales */}
      <div className="charts-grid">

        {/* Gráfica de tráfico */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="card-header">
            <h3>Tráfico de Red en el Tiempo</h3>
            <div className="pill">
              {trafficHistory && trafficHistory.length > 1
                ? `${trafficHistory.length} puntos · actualiza c/30s`
                : 'Sin datos aún — inicia captura'}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ left: -10, right: 10 }}>
              <defs>
                <linearGradient id="gPkt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gThr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f85149" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#f85149" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gDev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3fb950" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3fb950" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}
                labelStyle={{ color: 'var(--text-muted)' }}
              />
              <Area type="monotone" dataKey="paquetes" stroke="var(--accent)" fill="url(#gPkt)" name="Paquetes" strokeWidth={2} />
              <Area type="monotone" dataKey="amenazas" stroke="#f85149" fill="url(#gThr)" name="Amenazas" strokeWidth={2} />
              <Area type="monotone" dataKey="dispositivos" stroke="#3fb950" fill="url(#gDev)" name="Dispositivos" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart: estado de dispositivos */}
        <div className="card">
          <div className="card-header"><h3>Estado de Dispositivos</h3></div>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}>
                  {pieData.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Sin dispositivos detectados
            </div>
          )}
        </div>

        {/* Bar chart: tipos de dispositivos */}
        <div className="card">
          <div className="card-header">
            <h3><Cpu size={14} style={{ display: 'inline', marginRight: 6 }} />Tipos de Dispositivos</h3>
          </div>
          {deviceTypeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={deviceTypeData} margin={{ left: -20, right: 10 }}>
                <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }} />
                <Bar dataKey="value" name="Cantidad" radius={[4, 4, 0, 0]}>
                  {deviceTypeData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Sin dispositivos detectados
            </div>
          )}
        </div>

        {/* Estado del sistema */}
        <div className="card info-card">
          <div className="card-header">
            <h3>Estado del Sistema</h3>
            <Clock size={16} />
          </div>
          <div className="info-rows">
            <div className="info-row">
              <span>Estado</span>
              <span className={`pill ${status?.running ? 'pill-green' : 'pill-red'}`}>
                {status?.running ? '● Capturando' : '○ Detenido'}
              </span>
            </div>
            <div className="info-row">
              <span>Interfaz</span>
              <code>{status?.interface ?? '—'}</code>
            </div>
            <div className="info-row">
              <span>Tiempo activo</span>
              <code>{status?.uptime || '—'}</code>
            </div>
            <div className="info-row">
              <span>Scapy</span>
              <span className={`pill ${status?.scapy_available ? 'pill-green' : 'pill-red'}`}>
                {status?.scapy_available ? 'Disponible' : 'No instalado'}
              </span>
            </div>
            <div className="info-row">
              <span>Permisos root</span>
              <span className={`pill ${status?.has_root ? 'pill-green' : 'pill-red'}`}>
                {status?.has_root ? 'Sí' : 'No — usa sudo'}
              </span>
            </div>
            <div className="info-row">
              <span>Historial de tráfico</span>
              <span className="pill">{trafficHistory?.length ?? 0} puntos</span>
            </div>
          </div>
        </div>

      </div>

      {showDevices && <DeviceModal onClose={() => setShowDevices(false)} />}
    </div>
  )
}
