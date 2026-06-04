'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/shopify-data'

interface Provider {
  id: string
  displayName: string
  logoEmoji: string
  supportPhone: string
  brandColor: string
  shopifyTrackingCompany: string
  hasApi: boolean
}

interface Shipment {
  orderId: string
  orderName: string
  customerName: string
  customerEmail: string | null
  fulfillmentId: string
  fulfillmentStatus: string
  createdAt: string
  trackingCompany: string | null
  trackingNumber: string | null
  trackingUrl: string | null
  provider: { id: string; displayName: string; logoEmoji: string; brandColor: string } | null
  totalPrice: string
  currency: string
}

interface TrackResult {
  success: boolean
  provider: { displayName: string; logoEmoji: string; brandColor: string }
  trackingNumber: string
  trackingUrl: string
  isMock: boolean
  status: string
  label: string
  description?: string
  lastUpdate?: string
  events?: Array<{ date: string; description: string; location?: string }>
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending:          { bg: '#FEF3C7', color: '#92400E' },
  preparing:        { bg: '#DBEAFE', color: '#1E40AF' },
  shipped:          { bg: '#DBEAFE', color: '#1E40AF' },
  in_transit:       { bg: '#EDE9FE', color: '#7C3AED' },
  out_for_delivery: { bg: '#FED7AA', color: '#F97316' },
  delivered:        { bg: '#D1FAE5', color: '#065F46' },
  failed:           { bg: '#FEE2E2', color: '#991B1B' },
  returned:         { bg: '#FEE2E2', color: '#991B1B' },
  unknown:          { bg: '#F3F4F6', color: '#6B7280' },
}

export default function CargoPage() {
  const router = useRouter()
  const [providers, setProviders] = useState<Provider[]>([])
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [tracking, setTracking] = useState<TrackResult | null>(null)
  const [trackingBusy, setTrackingBusy] = useState(false)

  // Manuel takip formu
  const [manualProvider, setManualProvider] = useState('aras')
  const [manualNumber, setManualNumber] = useState('')

  async function loadAll() {
    setLoading(true)
    try {
      const [pRes, sRes] = await Promise.all([
        fetch('/api/cargo/providers').then(r => r.json()),
        fetch('/api/cargo/shipments').then(r => r.json()),
      ])
      if (pRes.success) setProviders(pRes.providers)
      if (sRes.success) setShipments(sRes.shipments || [])
    } finally { setLoading(false) }
  }
  useEffect(() => { loadAll() }, [])

  async function track(providerId: string, number: string) {
    if (!number.trim()) return
    setTrackingBusy(true); setTracking(null)
    try {
      const res = await fetch(`/api/cargo/track?provider=${providerId}&number=${encodeURIComponent(number)}`)
      const data = await res.json()
      if (data.success) setTracking(data)
      else alert('Hata: ' + data.message)
    } finally { setTrackingBusy(false) }
  }

  // Stats
  const byProvider = new Map<string, number>()
  const byStatus = new Map<string, number>()
  shipments.forEach(s => {
    const p = s.provider?.displayName ?? 'Bilinmiyor'
    byProvider.set(p, (byProvider.get(p) || 0) + 1)
    byStatus.set(s.fulfillmentStatus, (byStatus.get(s.fulfillmentStatus) || 0) + 1)
  })

  return (
    <div className="page-content">
      <div className="product-header">
        <h1 className="page-title">Kargo Takip</h1>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <div className="panel-card">
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Aktif Gönderi</div>
          <div style={{ fontSize: 32, fontWeight: 800, marginTop: 4 }}>{shipments.length}</div>
        </div>
        <div className="panel-card">
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Teslim Edildi</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#065F46', marginTop: 4 }}>
            {byStatus.get('SUCCESS') ?? byStatus.get('success') ?? 0}
          </div>
        </div>
        <div className="panel-card">
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Yolda / Hazırlanıyor</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#1E40AF', marginTop: 4 }}>
            {shipments.filter(s => !['SUCCESS', 'CANCELLED'].includes(s.fulfillmentStatus)).length}
          </div>
        </div>
        <div className="panel-card">
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Aktif Firma</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#7C3AED', marginTop: 4 }}>
            {byProvider.size}
          </div>
        </div>
      </div>

      {/* Manuel takip widget */}
      <div className="panel-card" style={{ borderLeft: '4px solid #2563EB' }}>
        <div className="settings-section-title">🔍 Manuel Kargo Takip</div>
        <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr 140px', gap: 10, alignItems: 'end' }}>
          <div>
            <label className="form-label">Firma</label>
            <select className="form-select" style={{ width: '100%' }}
              value={manualProvider} onChange={e => setManualProvider(e.target.value)}>
              {providers.map(p => (
                <option key={p.id} value={p.id}>{p.logoEmoji} {p.displayName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Takip Numarası</label>
            <input className="form-select" style={{ width: '100%' }}
              placeholder="1234567890"
              value={manualNumber} onChange={e => setManualNumber(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') track(manualProvider, manualNumber) }} />
          </div>
          <button className="btn-primary" disabled={trackingBusy || !manualNumber.trim()}
            onClick={() => track(manualProvider, manualNumber)}>
            {trackingBusy ? '⏳' : '🔎 Sorgula'}
          </button>
        </div>

        {tracking && (
          <div style={{
            marginTop: 14, padding: 16,
            background: STATUS_COLORS[tracking.status]?.bg ?? '#F3F4F6',
            borderRadius: 10,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {tracking.provider.logoEmoji} {tracking.provider.displayName} · {tracking.trackingNumber}
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: STATUS_COLORS[tracking.status]?.color, marginTop: 6 }}>
                  {tracking.label}
                </div>
                {tracking.lastUpdate && (
                  <div style={{ fontSize: 12, marginTop: 4, color: 'var(--text-muted)' }}>
                    Son güncelleme: {formatDate(tracking.lastUpdate)}
                  </div>
                )}
                {tracking.isMock && (
                  <div style={{ fontSize: 11, marginTop: 6, color: '#92400E', fontStyle: 'italic' }}>
                    ⚠️ Mock veri (gerçek API entegrasyonu için anlaşmalı key gerek)
                  </div>
                )}
              </div>
              <a className="btn-secondary" style={{ textDecoration: 'none', fontSize: 12 }}
                href={tracking.trackingUrl} target="_blank" rel="noopener">
                🔗 Firma Sayfasında Aç
              </a>
            </div>

            {tracking.events && tracking.events.length > 0 && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(0,0,0,.1)' }}>
                <strong style={{ fontSize: 12 }}>Hareket Geçmişi:</strong>
                {tracking.events.map((ev, i) => (
                  <div key={i} style={{ fontSize: 12, marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                    <span><strong>{ev.description}</strong> {ev.location && <span style={{ color: 'var(--text-muted)' }}>· {ev.location}</span>}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{formatDate(ev.date)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Desteklenen firmalar */}
      <div className="panel-card">
        <div className="settings-section-title">Desteklenen Kargo Firmaları</div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10,
        }}>
          {providers.map(p => (
            <div key={p.id} style={{
              padding: 14, background: 'var(--hover-bg)', borderRadius: 10,
              border: `1px solid var(--border-color)`,
              borderLeft: `4px solid ${p.brandColor}`,
            }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>{p.logoEmoji}</div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{p.displayName}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                📞 {p.supportPhone}
              </div>
              <div style={{ marginTop: 6 }}>
                <span style={{
                  fontSize: 10, padding: '2px 8px', borderRadius: 4, fontWeight: 700,
                  background: p.hasApi ? '#D1FAE5' : '#F3F4F6',
                  color: p.hasApi ? '#065F46' : '#6B7280',
                }}>
                  {p.hasApi ? '✓ API Hazır' : '⏳ Sadece Takip URL'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Aktif kargo listesi */}
      <div className="panel-card" style={{ padding: 0 }}>
        <div style={{ padding: 16, borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
          <strong>Aktif Kargo Gönderileri (Son 60 gün)</strong>
          <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={loadAll}>
            🔄 Yenile
          </button>
        </div>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>⏳ Yükleniyor...</div>
        ) : shipments.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-main)' }}>
              Aktif kargo gönderi yok
            </div>
            <div style={{ fontSize: 13, marginTop: 6 }}>
              Sipariş detayından "Kargo Başlat" ile fulfill ettiğinde burada görünecek.
            </div>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Sipariş</th>
                <th>Müşteri</th>
                <th>Firma</th>
                <th>Takip No</th>
                <th>Durum</th>
                <th>Tutar</th>
                <th>Tarih</th>
                <th style={{ textAlign: 'right' }}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {shipments.map(s => (
                <tr key={s.fulfillmentId}>
                  <td>
                    <a
                      style={{ color: '#2563EB', fontWeight: 600, cursor: 'pointer' }}
                      onClick={() => router.push(`/orders/${encodeURIComponent(s.orderId)}`)}
                    >{s.orderName}</a>
                  </td>
                  <td>
                    <div className="customer-cell">
                      <span className="customer-name">{s.customerName}</span>
                      {s.customerEmail && <span className="customer-email">{s.customerEmail}</span>}
                    </div>
                  </td>
                  <td>
                    {s.provider ? (
                      <span style={{
                        background: s.provider.brandColor + '20', color: s.provider.brandColor,
                        padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700,
                      }}>
                        {s.provider.logoEmoji} {s.provider.displayName}
                      </span>
                    ) : (
                      <small style={{ color: 'var(--text-muted)' }}>{s.trackingCompany || '—'}</small>
                    )}
                  </td>
                  <td>
                    {s.trackingNumber ? (
                      <code style={{ background: 'var(--hover-bg)', padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>
                        {s.trackingNumber}
                      </code>
                    ) : '—'}
                  </td>
                  <td>
                    <span className={`status-badge ${s.fulfillmentStatus === 'SUCCESS' ? 'delivered' : 'pending'}`}>
                      {s.fulfillmentStatus}
                    </span>
                  </td>
                  <td><strong>{formatCurrency(s.totalPrice, s.currency)}</strong></td>
                  <td><small>{formatDate(s.createdAt)}</small></td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      {s.provider && s.trackingNumber && (
                        <button className="btn-secondary" style={{ padding: '6px 10px', fontSize: 12 }}
                          onClick={() => track(s.provider!.id, s.trackingNumber!)}>
                          🔎 Sorgula
                        </button>
                      )}
                      {s.trackingUrl && (
                        <a className="btn-secondary" style={{ padding: '6px 10px', fontSize: 12, textDecoration: 'none' }}
                          href={s.trackingUrl} target="_blank" rel="noopener">
                          🔗
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
