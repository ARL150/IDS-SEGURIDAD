import { useState, useCallback, useEffect, useRef } from 'react'

const BASE = 'http://localhost:8000'

function getToken(): string {
  return localStorage.getItem('ids-token') ?? ''
}

function authHeaders(): HeadersInit {
  const t = getToken()
  return t ? { Authorization: `Bearer ${t}` } : {}
}

export function useApi<T>(endpoint: string, interval = 0) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}${endpoint}`, { headers: authHeaders() })
      if (res.status === 401) {
        // Token expirado — limpiar sesión (el Gate re-renderizará el Login)
        localStorage.removeItem('ids-token')
        localStorage.removeItem('ids-user')
        if (mountedRef.current) setError('Sesión expirada')
        return
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      if (mountedRef.current) { setData(json); setError(null) }
    } catch (e) {
      if (mountedRef.current) setError((e as Error).message)
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [endpoint])

  useEffect(() => {
    mountedRef.current = true
    fetch_()
    if (interval > 0) {
      const id = setInterval(fetch_, interval)
      return () => { mountedRef.current = false; clearInterval(id) }
    }
    return () => { mountedRef.current = false }
  }, [fetch_, interval])

  return { data, loading, error, refresh: fetch_ }
}

export async function apiPost<T>(endpoint: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error desconocido' }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function apiDelete(endpoint: string): Promise<void> {
  const res = await fetch(`${BASE}${endpoint}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

export async function apiPatch<T>(endpoint: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${endpoint}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error desconocido' }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}
