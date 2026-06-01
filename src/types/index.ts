export interface NetworkDevice {
  ip: string
  mac: string
  label: string
  authorized: boolean
  in_whitelist: boolean
  last_seen: string
  first_seen?: string
  packets: number
}

export interface DomainVisit {
  domain: string
  source_ip: string
  timestamp: string
  type: 'DNS' | 'HTTP' | 'HTTPS'
}

export interface TopDomain {
  domain: string
  count: number
}

export interface ThreatEvent {
  id: string
  timestamp: string
  source_ip: string
  dest_ip: string
  threat_type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  alert_sent: boolean
}

export interface BlacklistEntry {
  ip: string
  type: string
  severity: string
  description: string
}

export interface FeodoEntry {
  ip: string
  port: number | null
  malware: string
  status: 'Online' | 'Offline' | string
  country: string
  first_seen: string
  last_seen: string
  description: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  color: string
  source: 'feodo'
}

export interface ManualBlacklistEntry {
  ip: string
  threat_type: string
  description: string
  severity: string
  source: 'manual'
  added_at: string
}

export interface BlacklistStats {
  total_feed: number
  online: number
  offline: number
  malware_families: [string, number][]
  top_countries: [string, number][]
  fetched_at: string | null
  total_manual: number
}

export interface BlacklistData {
  feed: FeodoEntry[]
  manual: ManualBlacklistEntry[]
  stats: BlacklistStats
}

export interface ForensicReport {
  ip: string
  hostname: string
  threat_type: string
  org: string
  abuse_email: string
  country: string
  asn: string
  abuse_score?: number
  isp: string
  total_reports: number
  analyzed_at: string
  email_sent: boolean
}

export interface Alert {
  id: string
  timestamp: string
  type: 'whitelist' | 'threat' | 'forensic' | 'info'
  message: string
  severity: 'info' | 'warning' | 'danger' | 'critical'
  email_sent: boolean
}

export interface SystemStatus {
  running: boolean
  packets_captured: number
  interface: string
  uptime: string
  active_devices: number
  threats_detected: number
  alerts_sent: number
  scapy_available: boolean
  has_root: boolean
  capture_error: string | null
}

export type Theme = 'dark' | 'light' | 'cyberpunk' | 'ocean' | 'blood' | 'matrix'
export type ActiveView = 'dashboard' | 'packets' | 'whitelist' | 'blacklist' | 'domains' | 'threats' | 'forensics' | 'alerts' | 'settings'
