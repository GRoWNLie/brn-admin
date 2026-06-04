'use client'

import { useEffect, useState } from 'react'

interface Location {
  id: string
  name: string
  address: { city: string | null; country: string | null }
  isActive: boolean
}

export default function InventoryPage() {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/shopify/inventory')
      const data = await res.json()
      if (data.success) {
        setLocations(data.locations || [])
      } else {
        setError(data.message || 'Lokasyonlar alınamadı.')
      }
    } catch (e: any) {
      setError(e?.message || 'Bağlantı hatası.')
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const isScopeError = !!error && /read_locations|access scope|ACCESS_DENIED|Access denied/i.test(error)

  return (
    <div className="page-content">
      <div className="product-header">
        <h1 className="page-title">Envanter Lokasyonları</h1>
      </div>

      <div className="panel-card">
        <div className="settings-section-title">Aktif Lokasyonlar</div>
        {loading ? (
          <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>Yükleniyor...</div>
        ) : isScopeError ? (
          <div style={{ padding: 24, lineHeight: 1.6 }}>
            <div style={{ fontWeight: 700, color: '#B45309', marginBottom: 8 }}>
              ⚠️ İzin eksik: <code>read_locations</code>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Lokasyonlar Shopify'da mevcut ama Custom App'inde <strong>read_locations</strong> izni yok,
              bu yüzden çekilemiyor. Düzeltmek için:
              <ol style={{ margin: '10px 0 0 18px', padding: 0 }}>
                <li>Shopify Admin → <strong>Settings → Apps and sales channels → Develop apps</strong></li>
                <li>İlgili Custom App → <strong>Configuration → Admin API access scopes</strong></li>
                <li><code>read_locations</code> iznini işaretle → <strong>Save</strong></li>
                <li>Uygulamayı <strong>yeniden yükle/install</strong> et (token yeni izinle yenilensin)</li>
                <li>Yeni Admin API token'ını <code>.env</code> içine yaz ve sunucuyu yeniden başlat</li>
              </ol>
            </div>
          </div>
        ) : error ? (
          <div style={{ padding: 24, color: '#B91C1C', fontSize: 13 }}>
            ❌ {error}
          </div>
        ) : locations.length === 0 ? (
          <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>
            Lokasyon bulunamadı. Shopify Admin → Settings → Locations'tan ekleyebilirsin.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Lokasyon</th>
                <th>Şehir</th>
                <th>Ülke</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              {locations.map(l => (
                <tr key={l.id}>
                  <td><strong>{l.name}</strong></td>
                  <td>{l.address.city || '—'}</td>
                  <td>{l.address.country || '—'}</td>
                  <td>
                    <span className={`badge ${l.isActive ? 'badge-delivered' : 'badge-cancelled'}`}>
                      {l.isActive ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="panel-card" style={{ background: 'var(--hover-bg)' }}>
        <small style={{ color: 'var(--text-muted)' }}>
          💡 Her ürünün lokasyon bazlı stoğunu <strong>Ürünler → bir ürün → Düzenle</strong> sayfasından
          yönetebilirsin.
        </small>
      </div>
    </div>
  )
}
