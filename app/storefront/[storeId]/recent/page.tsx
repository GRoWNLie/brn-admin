'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function StorefrontRecent() {
  const { storeId } = useParams<{ storeId: string }>()
  const router = useRouter()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/storefront/${storeId}/me?include=recent`).then(async r => {
      if (r.status === 401) { router.push(`/storefront/${storeId}/login`); return }
      const d = await r.json()
      if (d.success) setItems(d.recent || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [storeId, router])

  return (
    <div>
      <h1 className="sf-h1">Son Görüntülediklerin</h1>
      <p className="sf-muted">Son baktığın ürünleri buradan kolayca tekrar bul.</p>
      {loading ? <div className="sf-card" style={{ marginTop: 16 }}><div className="sf-muted">⏳ Yükleniyor...</div></div>
        : items.length === 0 ? (
          <div className="sf-card" style={{ marginTop: 16, textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>👁</div>
            <div style={{ fontWeight: 600 }}>Henüz görüntülenen ürün yok</div>
            <div className="sf-muted" style={{ fontSize: 13, marginTop: 6 }}>Mağazada bir ürüne bakınca burada belirir.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginTop: 16 }}>
            {items.map(p => (
              <div key={p.id} className="sf-card" style={{ marginBottom: 0, textAlign: 'center', padding: 14 }}>
                <div style={{ width: '100%', aspectRatio: '1', background: 'var(--sf-card)', borderRadius: 'var(--sf-radius)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, marginBottom: 10 }}>
                  {p.image ? <img src={p.image} alt={p.title} style={{ maxWidth: '100%', maxHeight: '100%' }} /> : '📦'}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                <button className="sf-btn" style={{ fontSize: 12, padding: '8px 14px', width: '100%' }}>Sepete Ekle</button>
              </div>
            ))}
          </div>
        )}
    </div>
  )
}
