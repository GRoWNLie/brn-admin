'use client'

import { useState, useEffect, useCallback } from 'react'

interface VisitorData {
  id: string
  ip: string
  city: string | null
  country: string | null
  path: string
  pageType: string
  referrer: string
  trafficSource: string
  device: string
  browser: string
  firstSeen: string
  lastSeen: string
}

interface VisitorsResponse {
  success: boolean
  stats: { online: number; todayTotal: number; inCart: number; inCheckout: number }
  funnel: Record<string, number>
  trafficSources: Record<string, number>
  visitors: VisitorData[]
  updatedAt: string
}

const PAGE_TYPE_COLORS: Record<string, string> = {
  'Geziyor': '#6B7280',
  'Arıyor': '#8B5CF6',
  'Ürün Bakıyor': '#F59E0B',
  'Kategori': '#06B6D4',
  'Sepette': '#F97316',
  'Ödeme': '#EC4899',
  'Sipariş Verdi': '#10B981',
}

const DEVICE_ICONS: Record<string, string> = { desktop: '🖥️', mobile: '📱', tablet: '📱' }
const BROWSER_ICONS: Record<string, string> = { chrome: '🌐', firefox: '🦊', safari: '🧭', edge: '🔷', opera: '🔴', other: '🌐' }

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff}sn`
  if (diff < 3600) return `${Math.floor(diff / 60)}dk`
  return `${Math.floor(diff / 3600)}sa`
}

const FUNNEL_STEPS = ['Geziyor', 'Arıyor', 'Ürün Bakıyor', 'Kategori', 'Sepette', 'Ödeme', 'Sipariş Verdi']

export default function VisitorsPage() {
  const [data, setData] = useState<VisitorsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<string>('')

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/visitors')
      const json = await res.json()
      if (json.success) {
        setData(json)
        setLastUpdate(new Date().toLocaleTimeString('tr-TR'))
        setError(null)
      }
    } catch (e: any) {
      setError(e?.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [fetchData])

  if (loading) return (
    <div className="page-content" style={{ textAlign: 'center', paddingTop: 80 }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
      <div style={{ color: 'var(--text-muted)' }}>Ziyaretçi verisi yükleniyor...</div>
    </div>
  )

  if (error) return (
    <div className="page-content">
      <div className="panel-card" style={{ borderLeft: '4px solid #DC2626' }}>
        <div style={{ color: '#DC2626', fontWeight: 600 }}>❌ Hata: {error}</div>
      </div>
    </div>
  )

  const stats = data?.stats ?? { online: 0, todayTotal: 0, inCart: 0, inCheckout: 0 }
  const funnel = data?.funnel ?? {}
  const trafficSources = data?.trafficSources ?? {}
  const visitors = data?.visitors ?? []

  return (
    <div className="page-content">
      {/* Başlık */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>🔴 Canlı Ziyaretçi Takibi</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#DCFCE7', color: '#166534', padding: '4px 12px',
            borderRadius: 20, fontSize: 13, fontWeight: 600,
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%', background: '#22C55E',
              animation: 'pulse 2s infinite',
              display: 'inline-block',
            }} />
            CANLI
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Son güncelleme: {lastUpdate}</span>
        </div>
      </div>

      {/* Stats Kartları */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'ŞU AN ONLİNE', value: stats.online, color: '#3B82F6' },
          { label: 'BUGÜN TOPLAM', value: stats.todayTotal, color: '#10B981' },
          { label: 'SEPETTE', value: stats.inCart, color: '#F97316' },
          { label: 'ÖDEME AŞAMASINDA', value: stats.inCheckout, color: '#EC4899' },
        ].map(s => (
          <div key={s.label} className="panel-card" style={{ textAlign: 'center', padding: '20px 16px' }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, marginTop: 6, letterSpacing: '0.5px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Müşteri Yolculuğu Funnel */}
      <div className="panel-card" style={{ marginBottom: 20 }}>
        <div className="settings-section-title" style={{ marginBottom: 16 }}>🗺️ Müşteri Yolculuğu</div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${FUNNEL_STEPS.length}, 1fr)`, gap: 8 }}>
          {FUNNEL_STEPS.map((step, i) => {
            const count = funnel[step] ?? 0
            const color = PAGE_TYPE_COLORS[step] ?? '#6B7280'
            const isActive = count > 0
            return (
              <div key={step} style={{
                textAlign: 'center', padding: '12px 8px',
                borderRadius: 10,
                background: isActive ? `${color}18` : 'var(--hover-bg)',
                border: `2px solid ${isActive ? color : 'transparent'}`,
              }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: isActive ? color : 'var(--text-muted)' }}>{count}</div>
                <div style={{ fontSize: 11, color: isActive ? color : 'var(--text-muted)', fontWeight: 600, marginTop: 4 }}>{step}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Trafik Kaynakları */}
      {Object.keys(trafficSources).length > 0 && (
        <div className="panel-card" style={{ marginBottom: 20 }}>
          <div className="settings-section-title" style={{ marginBottom: 12 }}>📡 Trafik Kaynakları</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Object.entries(trafficSources).sort((a, b) => b[1] - a[1]).map(([src, count]) => (
              <span key={src} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'var(--hover-bg)', border: '1px solid var(--border-color)',
                padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600,
              }}>
                {src} <span style={{
                  background: '#3B82F6', color: '#fff',
                  borderRadius: 10, padding: '1px 7px', fontSize: 11,
                }}>{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Ziyaretçi Kartları */}
      <div className="panel-card">
        <div className="settings-section-title" style={{ marginBottom: 16 }}>
          👥 Aktif Ziyaretçiler ({visitors.length})
        </div>
        {visitors.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            Şu an aktif ziyaretçi yok.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 12 }}>
            {visitors.map(v => {
              const color = PAGE_TYPE_COLORS[v.pageType] ?? '#6B7280'
              return (
                <div key={v.id} style={{
                  border: `1px solid ${color}40`,
                  borderLeft: `4px solid ${color}`,
                  borderRadius: 10, padding: '12px 14px',
                  background: 'var(--hover-bg)',
                }}>
                  {/* Üst satır: konum + durum */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-main)' }}>
                        {v.country ? `${v.country} ` : ''}{v.city ?? v.ip}
                      </span>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: 2 }}>
                        {v.ip} · #{v.id.slice(-8)}
                      </div>
                    </div>
                    <span style={{
                      background: `${color}22`, color, fontWeight: 700,
                      padding: '3px 10px', borderRadius: 20, fontSize: 11,
                    }}>
                      {v.pageType}
                    </span>
                  </div>

                  {/* Path */}
                  <div style={{
                    fontSize: 12, color: 'var(--text-muted)',
                    background: 'var(--card-bg)', padding: '4px 8px', borderRadius: 6,
                    fontFamily: 'monospace', marginBottom: 8,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {v.path}
                  </div>

                  {/* Alt satır: cihaz + tarayıcı + kaynak + süre */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                    <span title={v.device}>{DEVICE_ICONS[v.device]}</span>
                    <span title={v.browser}>{BROWSER_ICONS[v.browser]}</span>
                    <span style={{
                      background: '#EFF6FF', color: '#1D4ED8', padding: '2px 7px',
                      borderRadius: 4, fontSize: 11, fontWeight: 600,
                    }}>
                      {v.trafficSource}
                    </span>
                    <span style={{ marginLeft: 'auto', fontSize: 11 }}>
                      {timeAgo(v.lastSeen)} önce
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
