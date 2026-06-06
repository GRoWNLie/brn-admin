'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function StorefrontTop() {
  const { storeId } = useParams<{ storeId: string }>()
  const router = useRouter()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/storefront/${storeId}/me?include=top`).then(async r => {
      if (r.status === 401) {
        if (typeof window !== 'undefined' && window.location.pathname.includes('/apps/customerdashboard')) {
          window.location.href = '/apps/customerdashboard/login'
        } else {
          router.push(`/storefront/${storeId}/login`)
        }
        return
      }
      const d = await r.json()
      if (d.success) setItems(d.top || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [storeId, router])

  return (
    <div>
      <h1 className="sf-h1">En Çok Sipariş Verdiklerin</h1>
      <p className="sf-muted">Sık aldığın ürünleri tek tıkla yeniden sipariş ver.</p>
      {loading ? <div className="sf-card" style={{ marginTop: 16 }}><div className="sf-muted">⏳ Yükleniyor...</div></div>
        : items.length === 0 ? (
          <div className="sf-card" style={{ marginTop: 16, textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🏆</div>
            <div style={{ fontWeight: 600 }}>Veri yok</div>
            <div className="sf-muted" style={{ fontSize: 13, marginTop: 6 }}>Sipariş geçmişin biriktikçe burada görünür.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12, marginTop: 16 }}>
            {items.map(p => (
              <div key={p.id} className="sf-card" style={{ marginBottom: 0, padding: 14 }}>
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ width: 60, height: 60, background: 'var(--sf-card)', borderRadius: 'var(--sf-radius)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
                    {p.image ? <img src={p.image} alt={p.title} style={{ maxWidth: '100%', maxHeight: '100%' }} /> : '📦'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{p.title}</div>
                    <div className="sf-muted" style={{ fontSize: 12 }}>{p.count} kez sipariş verildi</div>
                  </div>
                </div>
                <button className="sf-btn" style={{ fontSize: 12, padding: '8px 14px', width: '100%', marginTop: 10 }}>🔁 Sepete Ekle</button>
              </div>
            ))}
          </div>
        )}
    </div>
  )
}
