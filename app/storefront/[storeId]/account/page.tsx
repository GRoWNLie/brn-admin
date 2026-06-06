'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

export default function StorefrontAccount() {
  const { storeId } = useParams<{ storeId: string }>()
  const router = useRouter()
  const base = `/storefront/${storeId}`
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/storefront/${storeId}/me?include=orders`).then(async r => {
      if (r.status === 401) { (window.location.pathname.includes('/apps/customerdashboard') ? (window.location.href = '/apps/customerdashboard/login') : router.push(`${base}/login`)); return }
      const d = await r.json()
      if (d.success) setData(d)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [storeId, router, base])

  async function logout() {
    await fetch(`/api/storefront/${storeId}/logout`, { method: 'POST' })
    if (window.location.pathname.includes('/apps/customerdashboard')) {
      window.location.href = '/apps/customerdashboard/login'
    } else {
      router.push(`${base}/login`)
    }
  }

  if (loading) return <div className="sf-card"><div className="sf-muted">⏳ Yükleniyor...</div></div>
  if (!data?.customer) return null
  const c = data.customer
  const lastOrder = data.orders?.[0]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="sf-h1">Hoş geldin, {c.firstName}!</h1>
          <p className="sf-muted">Hesap özeti ve hızlı erişim.</p>
        </div>
        <button onClick={logout} className="sf-btn-secondary">Çıkış</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 14, marginTop: 16 }}>
        <div className="sf-card">
          <h2 className="sf-h2">👤 Hesap Bilgileri</h2>
          <div style={{ fontSize: 13, lineHeight: 1.8 }}>
            <div><strong>{c.firstName} {c.lastName}</strong></div>
            <div>📧 {c.email}</div>
            <div>📞 {c.phone || '—'}</div>
          </div>
        </div>

        <div className="sf-card">
          <h2 className="sf-h2">🏠 Varsayılan Adres</h2>
          {c.defaultAddress ? (
            <div style={{ fontSize: 13, lineHeight: 1.7 }}>
              {c.defaultAddress.address1}<br />
              {c.defaultAddress.zip} {c.defaultAddress.city} / {c.defaultAddress.province}<br />
              {c.defaultAddress.country}
            </div>
          ) : <div className="sf-muted" style={{ fontSize: 13 }}>Adres yok</div>}
          <Link href={`${base}/addresses`} className="sf-btn-secondary" style={{ display: 'inline-block', marginTop: 12, textDecoration: 'none' }}>Adreslerim</Link>
        </div>

        <div className="sf-card">
          <h2 className="sf-h2">🛒 Son Sipariş</h2>
          {lastOrder ? (
            <div style={{ fontSize: 13, lineHeight: 1.7 }}>
              <strong>{lastOrder.name}</strong> · {new Date(lastOrder.createdAt).toLocaleDateString('tr-TR')}<br />
              {lastOrder.lineCount} ürün · <strong>{parseFloat(lastOrder.total).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {lastOrder.currency}</strong>
            </div>
          ) : <div className="sf-muted" style={{ fontSize: 13 }}>Henüz sipariş yok.</div>}
          <Link href={`${base}/orders`} className="sf-btn-secondary" style={{ display: 'inline-block', marginTop: 12, textDecoration: 'none' }}>Tüm Siparişler</Link>
        </div>
      </div>
    </div>
  )
}
