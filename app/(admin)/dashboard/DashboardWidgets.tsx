'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface LowStockItem {
  id: string
  title: string
  image: string | null
  stock: number
  price: string
}

export default function DashboardWidgets() {
  const [visitors, setVisitors] = useState<number | null>(null)
  const [items, setItems] = useState<LowStockItem[]>([])
  const [loadingStock, setLoadingStock] = useState(true)

  // Canlı ziyaretçi — 30 sn'de bir poll
  useEffect(() => {
    let alive = true
    async function poll() {
      try {
        const res = await fetch('/api/shopify/live-visitors')
        const data = await res.json()
        if (alive && data.success) setVisitors(data.count)
      } catch {}
    }
    poll()
    const id = setInterval(poll, 30000)
    return () => { alive = false; clearInterval(id) }
  }, [])

  // Düşük stok
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await fetch('/api/shopify/low-stock?threshold=5')
        const data = await res.json()
        if (alive && data.success) setItems(data.items)
      } finally { if (alive) setLoadingStock(false) }
    })()
    return () => { alive = false }
  }, [])

  return (
    <div className="dashboard-grid-2">
      {/* Canlı Ziyaretçi */}
      <div className="panel-card">
        <div className="card-header">
          <div className="card-title">Canlı Ziyaretçi</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 0' }}>
          <div style={{ position: 'relative', width: 18, height: 18 }}>
            <span style={{
              position: 'absolute', inset: 0, borderRadius: '50%', background: '#10B981',
              animation: 'brnpulse 1.6s infinite',
            }} />
            <span style={{
              position: 'absolute', inset: 4, borderRadius: '50%', background: '#10B981',
            }} />
          </div>
          <div>
            <div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1 }}>
              {visitors === null ? '…' : visitors}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              şu an mağazada aktif
            </div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          Son 5 dakikada aktif · her 30 saniyede güncellenir
        </div>
        <details style={{ marginTop: 12 }}>
          <summary style={{ fontSize: 11, color: '#2563EB', cursor: 'pointer' }}>
            ⚙️ Takibi nasıl aktif ederim?
          </summary>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.5 }}>
            Shopify temanın <code>theme.liquid</code> dosyasında <code>&lt;/body&gt;</code> öncesine ekle:
            <pre style={{
              background: 'var(--bg-main)', padding: 8, borderRadius: 6, marginTop: 6,
              overflowX: 'auto', fontSize: 11, border: '1px solid var(--border-color)',
            }}>{`<script src="${typeof window !== 'undefined' ? window.location.origin : ''}/widget/tracker.js" async></script>`}</pre>
          </div>
        </details>
        <style>{`@keyframes brnpulse { 0% { transform: scale(0.8); opacity: 0.7; } 70% { transform: scale(1.6); opacity: 0; } 100% { opacity: 0; } }`}</style>
      </div>

      {/* Düşük Stok */}
      <div className="panel-card">
        <div className="card-header">
          <div className="card-title">⚠️ Düşük Stok (≤5)</div>
          <Link href="/products" style={{ fontSize: 12, color: '#2563EB', textDecoration: 'none' }}>
            Tümü →
          </Link>
        </div>
        {loadingStock ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>⏳ Yükleniyor...</div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-title">Kritik stok yok 🎉</div>
            <div className="empty-state-text">Tüm ürünlerin stoğu yeterli.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
            {items.map(p => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '8px 0', borderBottom: '1px solid var(--border-color)',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 6, background: 'var(--hover-bg)', overflow: 'hidden',
                  flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {p.image
                    ? <img src={p.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: 16 }}>📦</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 600,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{p.title}</div>
                </div>
                <span style={{
                  fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 12,
                  background: p.stock === 0 ? '#FEE2E2' : '#FEF3C7',
                  color: p.stock === 0 ? '#991B1B' : '#92400E',
                }}>{p.stock === 0 ? 'Tükendi' : `${p.stock} adet`}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
