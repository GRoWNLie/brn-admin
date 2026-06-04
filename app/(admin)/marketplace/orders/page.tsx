'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const MPS = [
  { code: 'TRENDYOL', name: 'Trendyol' },
  { code: 'HEPSIBURADA', name: 'Hepsiburada' },
  { code: 'AMAZON', name: 'Amazon' },
  { code: 'ETSY', name: 'Etsy' },
]

interface MOrder {
  id: number; orderNumber: string; status: string | null; customerName: string | null
  total: number | null; currency: string | null; lineCount: number | null; orderedAt: string | null
}

export default function MarketplaceOrdersPage() {
  const [mp, setMp] = useState('TRENDYOL')
  const [rows, setRows] = useState<MOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/marketplace/${mp}?resource=orders`)
    const data = await res.json()
    if (data.success) setRows(data.orders)
    setLoading(false)
  }
  useEffect(() => { load() }, [mp])

  async function fetchOrders() {
    setBusy(true); setMsg(null)
    try {
      const res = await fetch(`/api/marketplace/${mp}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'orders', sinceDays: 14 }),
      })
      const data = await res.json()
      setMsg(data.message)
      await load()
    } finally { setBusy(false) }
  }

  const total = rows.reduce((s, r) => s + (r.total || 0), 0)

  return (
    <div className="page-content">
      <div className="product-header">
        <h1 className="page-title">📦 Pazaryeri Siparişleri</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/marketplace" className="btn-secondary" style={{ textDecoration: 'none' }}>← Pazaryerleri</Link>
          <button className="btn-primary" onClick={fetchOrders} disabled={busy}>
            {busy ? '⏳ Çekiliyor...' : '📥 Siparişleri Çek (son 14 gün)'}
          </button>
        </div>
      </div>

      <div className="panel-card" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <select className="form-select" value={mp} onChange={e => setMp(e.target.value)} style={{ minWidth: 160 }}>
          {MPS.map(m => <option key={m.code} value={m.code}>{m.name}</option>)}
        </select>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {rows.length} sipariş · Toplam: <strong>₺{total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</strong>
        </span>
        {msg && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{msg}</span>}
      </div>

      <div className="panel-card" style={{ padding: 0 }}>
        {loading ? <div style={{ padding: 40, textAlign: 'center' }}>⏳ Yükleniyor...</div>
          : rows.length === 0 ? (
            <div style={{ padding: 50, textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>📦</div>
              <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>Sipariş yok</div>
              <div style={{ fontSize: 13, marginTop: 6 }}>"📥 Siparişleri Çek" ile pazaryerinden çekin.</div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>Sipariş No</th><th>Müşteri</th><th>Durum</th><th>Kalem</th><th>Tutar</th><th>Tarih</th></tr>
              </thead>
              <tbody>
                {rows.map(o => (
                  <tr key={o.id}>
                    <td><code>{o.orderNumber}</code></td>
                    <td>{o.customerName || '—'}</td>
                    <td><span className="status-badge pending">{o.status || '—'}</span></td>
                    <td>{o.lineCount ?? '—'}</td>
                    <td><strong>₺{(o.total || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</strong></td>
                    <td><small>{o.orderedAt ? new Date(o.orderedAt).toLocaleString('tr-TR') : '—'}</small></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
    </div>
  )
}
