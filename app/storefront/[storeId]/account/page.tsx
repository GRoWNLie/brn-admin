'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'

// Faz 3: Customer Account API'den gerçek müşteri verisi çekilecek.
// Şimdilik temayı ve içeriği gösteren iskelet.
export default function StorefrontAccount() {
  const { storeId } = useParams<{ storeId: string }>()
  const base = `/storefront/${storeId}`
  const customer = { firstName: 'Misafir', lastName: '', email: 'demo@example.com', phone: '—', defaultAddress: 'Adres bilgisi yok' }

  return (
    <div>
      <h1 className="sf-h1">Hoş geldin, {customer.firstName}!</h1>
      <p className="sf-muted">Hesap özeti ve hızlı erişim.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 14, marginTop: 16 }}>
        <div className="sf-card">
          <h2 className="sf-h2">👤 Hesap Bilgileri</h2>
          <div style={{ fontSize: 13, lineHeight: 1.8 }}>
            <div><strong>{customer.firstName} {customer.lastName}</strong></div>
            <div>📧 {customer.email}</div>
            <div>📞 {customer.phone}</div>
          </div>
          <Link href={`${base}/account/edit`} className="sf-btn-secondary" style={{ display: 'inline-block', marginTop: 12, textDecoration: 'none' }}>Düzenle</Link>
        </div>
        <div className="sf-card">
          <h2 className="sf-h2">🏠 Varsayılan Adres</h2>
          <div style={{ fontSize: 13, lineHeight: 1.7 }}>{customer.defaultAddress}</div>
          <Link href={`${base}/addresses`} className="sf-btn-secondary" style={{ display: 'inline-block', marginTop: 12, textDecoration: 'none' }}>Adreslerim</Link>
        </div>
        <div className="sf-card">
          <h2 className="sf-h2">🛒 Son Sipariş</h2>
          <div className="sf-muted" style={{ fontSize: 13 }}>Henüz sipariş yok.</div>
          <Link href={`${base}/orders`} className="sf-btn-secondary" style={{ display: 'inline-block', marginTop: 12, textDecoration: 'none' }}>Tüm Siparişler</Link>
        </div>
      </div>

      <div className="sf-card" style={{ marginTop: 18, background: 'rgba(37,99,235,.06)', borderColor: 'rgba(37,99,235,.25)' }}>
        <h2 className="sf-h2">⚠️ Faz 2 (İskelet) — Faz 3'te Doldurulacak</h2>
        <ul style={{ fontSize: 13, margin: '6px 0 0 18px', lineHeight: 1.7 }}>
          <li>Shopify Customer Account API ile gerçek hesap bilgileri</li>
          <li>Siparişler ve adresler canlı veri</li>
          <li>"Recently viewed" ve "Top ordered" ürünler</li>
        </ul>
      </div>
    </div>
  )
}
