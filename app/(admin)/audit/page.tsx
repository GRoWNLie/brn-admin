'use client'

import { useEffect, useState } from 'react'

interface AuditEntry {
  id: number
  userId: number
  userEmail: string
  action: string
  resource: string | null
  detail: any
  ip: string | null
  createdAt: string
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [actionFilter, setActionFilter] = useState('')
  const [skip, setSkip] = useState(0)
  const take = 50

  async function load(opts?: { skip?: number; action?: string }) {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('take', String(take))
      params.set('skip', String(opts?.skip ?? skip))
      if (opts?.action ?? actionFilter) params.set('action', opts?.action ?? actionFilter)
      const res = await fetch('/api/audit?' + params.toString())
      const data = await res.json()
      if (data.success) {
        setLogs(data.logs)
        setTotal(data.total)
      }
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function applyFilter() { setSkip(0); load({ skip: 0, action: actionFilter }) }
  function nextPage() { const s = skip + take; setSkip(s); load({ skip: s }) }
  function prevPage() { const s = Math.max(0, skip - take); setSkip(s); load({ skip: s }) }

  return (
    <div className="page-content">
      <div className="product-header">
        <h1 className="page-title">📋 Audit Log</h1>
      </div>

      <div className="panel-card">
        <div className="table-toolbar">
          <div className="toolbar-left" style={{ display: 'flex', gap: 8 }}>
            <input
              className="form-select"
              placeholder="Action ara (örn: products, team)"
              value={actionFilter}
              onChange={e => setActionFilter(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') applyFilter() }}
              style={{ minWidth: 240 }}
            />
            <button className="btn-secondary" onClick={applyFilter}>Filtrele</button>
            {actionFilter && (
              <button className="btn-secondary" onClick={() => { setActionFilter(''); setSkip(0); load({ skip: 0, action: '' }) }}>
                ✕ Temizle
              </button>
            )}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Toplam: <b>{total.toLocaleString('tr-TR')}</b> kayıt
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>⏳ Yükleniyor...</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Kayıt yok.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 160 }}>Zaman</th>
                <th>Kullanıcı</th>
                <th>İşlem</th>
                <th>Kaynak</th>
                <th>Detay</th>
                <th style={{ width: 120 }}>IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.id}>
                  <td><small>{new Date(l.createdAt).toLocaleString('tr-TR')}</small></td>
                  <td><small>{l.userEmail}</small></td>
                  <td>
                    <code style={{
                      fontSize: 11, padding: '2px 6px', background: 'var(--hover-bg)',
                      borderRadius: 4, color: 'var(--text-color)',
                    }}>{l.action}</code>
                  </td>
                  <td><small style={{ color: 'var(--text-muted)' }}>{l.resource ?? '—'}</small></td>
                  <td>
                    {l.detail ? (
                      <details>
                        <summary style={{ cursor: 'pointer', fontSize: 11, color: 'var(--text-muted)' }}>Göster</summary>
                        <pre style={{
                          fontSize: 10, background: 'var(--hover-bg)', padding: 8, borderRadius: 4,
                          margin: '4px 0 0', maxWidth: 400, overflow: 'auto',
                        }}>{JSON.stringify(l.detail, null, 2)}</pre>
                      </details>
                    ) : <small style={{ color: 'var(--text-muted)' }}>—</small>}
                  </td>
                  <td><small style={{ color: 'var(--text-muted)' }}>{l.ip ?? '—'}</small></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="table-footer">
          <div>Sayfa başına {take}</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12 }}>{skip + 1}-{Math.min(skip + take, total)} / {total}</span>
            <button className="btn-secondary" onClick={prevPage} disabled={skip === 0 || loading}>« Önceki</button>
            <button className="btn-secondary" onClick={nextPage} disabled={skip + take >= total || loading}>Sonraki »</button>
          </div>
        </div>
      </div>
    </div>
  )
}
