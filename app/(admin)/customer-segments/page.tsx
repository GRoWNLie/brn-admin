'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Segment {
  count: number
  label: string
  description: string
  color: string
  filter: () => boolean
}

interface CustomerRow {
  id: string
  displayName: string
  email: string | null
  ordersCount: number
  totalSpent: string
  currency: string
  createdAt: string
}

/**
 * RFM-lite segmentasyon: Shopify'dan müşteri listesini çekip
 * yerel olarak segmentlere ayırır (Yeni / Aktif / Sadık / Riskli / Kayıp / VIP).
 */
export default function CustomerSegmentsPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<CustomerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSegment, setActiveSegment] = useState<string>('all')

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/shopify/customers?first=100')
      const data = await res.json()
      if (data.success) setCustomers(data.customers || [])
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const now = Date.now()
  const dayMs = 24 * 60 * 60 * 1000

  function segmentOf(c: CustomerRow): string {
    const ageDays = (now - new Date(c.createdAt).getTime()) / dayMs
    const spent = parseFloat(c.totalSpent)

    if (spent >= 5000) return 'vip'
    if (c.ordersCount >= 5) return 'loyal'
    if (c.ordersCount >= 2) return 'active'
    if (c.ordersCount === 1 && ageDays < 30) return 'new'
    if (c.ordersCount === 0) return 'prospect'
    if (c.ordersCount >= 1 && ageDays > 180) return 'risky'
    return 'other'
  }

  const segmentMeta: Record<string, { label: string; description: string; color: string }> = {
    vip:      { label: '👑 VIP',         description: 'En çok harcayan (₺5.000+)',  color: '#7C3AED' },
    loyal:    { label: '💎 Sadık',       description: '5+ sipariş',                  color: '#059669' },
    active:   { label: '✅ Aktif',       description: '2-4 sipariş',                  color: '#2563EB' },
    new:      { label: '🆕 Yeni',        description: 'Son 30 günde ilk sipariş',    color: '#0EA5E9' },
    risky:    { label: '⚠️ Riskli',      description: '6 aydır yeni sipariş yok',   color: '#DC2626' },
    prospect: { label: '👤 Potansiyel',  description: 'Hiç sipariş yok',             color: '#6B7280' },
    other:    { label: '📊 Diğer',       description: '—',                            color: '#94A3B8' },
  }

  const counts: Record<string, number> = {}
  customers.forEach(c => { const s = segmentOf(c); counts[s] = (counts[s] ?? 0) + 1 })

  const filteredCustomers = activeSegment === 'all'
    ? customers
    : customers.filter(c => segmentOf(c) === activeSegment)

  return (
    <div className="page-content">
      <div className="product-header">
        <h1 className="page-title">Müşteri Segmentleri</h1>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12,
      }}>
        <div
          className="panel-card"
          style={{
            cursor: 'pointer',
            borderLeft: `4px solid ${activeSegment === 'all' ? '#0F172A' : 'transparent'}`,
          }}
          onClick={() => setActiveSegment('all')}
        >
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>📋 Tümü</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{customers.length}</div>
        </div>
        {Object.entries(segmentMeta).map(([key, meta]) => (
          <div
            key={key}
            className="panel-card"
            style={{
              cursor: 'pointer',
              borderLeft: `4px solid ${activeSegment === key ? meta.color : 'transparent'}`,
            }}
            onClick={() => setActiveSegment(key)}
          >
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{meta.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: meta.color }}>
              {counts[key] ?? 0}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{meta.description}</div>
          </div>
        ))}
      </div>

      <div className="panel-card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>⏳ Yükleniyor...</div>
        ) : filteredCustomers.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            Bu segmentte müşteri yok.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Müşteri</th>
                <th>Email</th>
                <th>Segment</th>
                <th>Sipariş</th>
                <th>Harcama</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map(c => {
                const s = segmentOf(c)
                const meta = segmentMeta[s]
                return (
                  <tr key={c.id} style={{ cursor: 'pointer' }}
                    onClick={() => router.push(`/customers/${encodeURIComponent(c.id)}`)}>
                    <td><strong style={{ color: '#2563EB' }}>{c.displayName}</strong></td>
                    <td><small>{c.email || '—'}</small></td>
                    <td>
                      <span style={{
                        background: meta.color + '20', color: meta.color,
                        padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                      }}>{meta.label}</span>
                    </td>
                    <td>{c.ordersCount}</td>
                    <td><strong>₺{parseFloat(c.totalSpent).toLocaleString('tr-TR')}</strong></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
