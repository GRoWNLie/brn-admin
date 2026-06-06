'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function StorefrontAddresses() {
  const { storeId } = useParams<{ storeId: string }>()
  const router = useRouter()
  const [addresses, setAddresses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/storefront/${storeId}/me?include=addresses`).then(async r => {
      if (r.status === 401) { (window.location.pathname.includes('/apps/customerdashboard') ? (window.location.href = '/apps/customerdashboard/login') : router.push(`/storefront/${storeId}/login`)); return }
      const d = await r.json()
      if (d.success) setAddresses(d.addresses || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [storeId, router])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 className="sf-h1">Adreslerim</h1>
          <p className="sf-muted">Teslimat adreslerini yönet, varsayılan adresini seç.</p>
        </div>
        <button className="sf-btn">➕ Adres Ekle</button>
      </div>

      {loading ? <div className="sf-card" style={{ marginTop: 16 }}><div className="sf-muted">⏳ Yükleniyor...</div></div>
        : addresses.length === 0 ? (
          <div className="sf-card" style={{ marginTop: 16, textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🏠</div>
            <div style={{ fontWeight: 600 }}>Kayıtlı adres yok</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 14, marginTop: 16 }}>
            {addresses.map(a => (
              <div key={a.id} className="sf-card" style={{ marginBottom: 0, position: 'relative' }}>
                {a.isDefault && (
                  <span style={{ position: 'absolute', top: 12, right: 12, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: 'var(--sf-primary)', color: '#fff' }}>VARSAYILAN</span>
                )}
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{a.firstName} {a.lastName}</div>
                <div style={{ fontSize: 13, lineHeight: 1.7 }}>
                  {a.address1}{a.address2 ? ` ${a.address2}` : ''}<br />
                  {a.zip} {a.city} / {a.province}<br />
                  {a.country}
                  {a.phone && <><br />📞 {a.phone}</>}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button className="sf-btn-secondary" style={{ fontSize: 12 }}>Düzenle</button>
                  {!a.isDefault && <button className="sf-btn-secondary" style={{ fontSize: 12 }}>Varsayılan Yap</button>}
                  <button className="sf-btn-secondary" style={{ fontSize: 12, color: '#DC2626', borderColor: '#DC2626' }}>Sil</button>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  )
}
