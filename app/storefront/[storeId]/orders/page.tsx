'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

const FIN_LABEL: Record<string, { label: string; color: string }> = {
  PAID: { label: 'Ödendi', color: '#059669' },
  PENDING: { label: 'Beklemede', color: '#D97706' },
  REFUNDED: { label: 'İade', color: '#DC2626' },
  VOIDED: { label: 'İptal', color: '#6B7280' },
}
const FUL_LABEL: Record<string, { label: string; color: string }> = {
  FULFILLED: { label: 'Teslim Edildi', color: '#059669' },
  IN_PROGRESS: { label: 'Hazırlanıyor', color: '#D97706' },
  UNFULFILLED: { label: 'Bekliyor', color: '#6B7280' },
  PARTIALLY_FULFILLED: { label: 'Kısmen Gönderildi', color: '#D97706' },
}

export default function StorefrontOrders() {
  const { storeId } = useParams<{ storeId: string }>()
  const router = useRouter()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/storefront/${storeId}/me?include=orders`).then(async r => {
      if (r.status === 401) {
        if (typeof window !== 'undefined' && window.location.pathname.includes('/apps/customerdashboard')) {
          window.location.href = '/apps/customerdashboard/login'
        } else {
          router.push(`/storefront/${storeId}/login`)
        }
        return
      }
      const d = await r.json()
      if (d.success) setOrders(d.orders || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [storeId, router])

  return (
    <div>
      <h1 className="sf-h1">Siparişlerim</h1>
      <p className="sf-muted">Tüm siparişlerini, durumlarını ve detaylarını burada görebilirsin.</p>

      {loading ? <div className="sf-card" style={{ marginTop: 16 }}><div className="sf-muted">⏳ Yükleniyor...</div></div>
        : orders.length === 0 ? (
          <div className="sf-card" style={{ marginTop: 16, textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📦</div>
            <div style={{ fontWeight: 600 }}>Henüz sipariş yok</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
            {orders.map(o => {
              const fin = FIN_LABEL[o.financialStatus] || { label: o.financialStatus, color: '#6B7280' }
              const ful = FUL_LABEL[o.fulfillmentStatus] || { label: o.fulfillmentStatus, color: '#6B7280' }
              return (
                <div key={o.id} className="sf-card" style={{ marginBottom: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700 }}>{o.name}</div>
                      <div className="sf-muted" style={{ fontSize: 12 }}>
                        {new Date(o.createdAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })} · {o.lineCount} ürün
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>
                        {parseFloat(o.total).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {o.currency}
                      </div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: fin.color + '22', color: fin.color }}>{fin.label}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: ful.color + '22', color: ful.color }}>{ful.label}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button className="sf-btn-secondary" style={{ fontSize: 13 }}>Detay</button>
                    <button className="sf-btn-secondary" style={{ fontSize: 13 }}>🔁 Tekrar Sipariş</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
    </div>
  )
}
