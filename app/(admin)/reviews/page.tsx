'use client'

import { useEffect, useState } from 'react'
import { formatDate } from '@/lib/shopify-data'

interface Review {
  id: number
  shopifyProductId: string
  productTitle: string
  customerName: string
  customerEmail: string | null
  rating: number
  title: string | null
  content: string
  images: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SPAM'
  aiSummary: string | null
  aiSpamScore: number | null
  rejectionReason: string | null
  createdAt: string
  reviewedAt: string | null
}

const STATUS_TABS = [
  { value: 'PENDING', label: '⏳ Onay Bekliyor', color: '#92400E' },
  { value: 'APPROVED', label: '✅ Onaylı', color: '#065F46' },
  { value: 'REJECTED', label: '❌ Reddedildi', color: '#991B1B' },
  { value: 'SPAM', label: '🚫 Spam', color: '#6B7280' },
]

function Stars({ rating }: { rating: number }) {
  return (
    <div style={{ display: 'inline-flex', gap: 1 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{ color: i <= rating ? '#FBBF24' : '#E5E7EB' }}>★</span>
      ))}
    </div>
  )
}

export default function ReviewsPage() {
  const [activeTab, setActiveTab] = useState('PENDING')
  const [reviews, setReviews] = useState<Review[]>([])
  const [summary, setSummary] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<number | null>(null)

  // Demo veri için butonlar
  const [showDemo, setShowDemo] = useState(false)

  async function load(status?: string) {
    setLoading(true)
    try {
      const url = `/api/reviews?status=${status || activeTab}`
      const res = await fetch(url)
      const data = await res.json()
      if (data.success) {
        setReviews(data.reviews)
        setSummary(data.summary)
      }
    } finally { setLoading(false) }
  }
  useEffect(() => { load(activeTab) }, [activeTab])

  async function setStatus(id: number, status: string, reason?: string) {
    setBusy(id)
    try {
      await fetch(`/api/reviews/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, rejectionReason: reason }),
      })
      await load(activeTab)
    } finally { setBusy(null) }
  }

  async function addDemo() {
    const demoReviews = [
      { rating: 5, customerName: 'Ayşe Y.', content: 'Harika ürün, tam aradığım gibi! Hızlı kargo için teşekkürler.', title: 'Mükemmel kalite' },
      { rating: 4, customerName: 'Mehmet K.', content: 'Genel olarak iyi ama beden tablosu yanlış. Bir beden büyük gelmiş.', title: 'Beden uyumsuzluğu' },
      { rating: 2, customerName: 'Anonim', content: 'BUY NOW AT http://cheap-deals.example.com !!!', title: 'kazanç fırsatı' },
      { rating: 5, customerName: 'Zeynep T.', content: 'Çok beğendim, gönül rahatlığıyla tavsiye ederim 🙌', title: '' },
    ]
    for (const r of demoReviews) {
      await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopifyProductId: 'gid://shopify/Product/8676958535734',
          productTitle: 'Demo Ürün',
          ...r,
        }),
      })
    }
    await load(activeTab)
  }

  return (
    <div className="page-content">
      <div className="product-header">
        <h1 className="page-title">Yorum Yönetimi</h1>
        <div className="product-actions-right" style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" onClick={addDemo}>🧪 4 Demo Yorum Ekle</button>
          <a href="/reviews/embed" className="btn-primary"
            style={{ textDecoration: 'none' }}>
            📦 Shopify Temasına Yerleştir →
          </a>
        </div>
      </div>

      {/* Sekmeler */}
      <div style={{ display: 'flex', gap: 6, borderBottom: '1px solid var(--border-color)' }}>
        {STATUS_TABS.map(t => (
          <button key={t.value}
            onClick={() => setActiveTab(t.value)}
            style={{
              padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
              fontWeight: activeTab === t.value ? 700 : 500,
              color: activeTab === t.value ? t.color : 'var(--text-muted)',
              borderBottom: activeTab === t.value ? `2px solid ${t.color}` : 'none',
              marginBottom: -1,
            }}>
            {t.label}
            {summary[t.value] > 0 && (
              <span style={{
                marginLeft: 6, fontSize: 11,
                background: t.color + '20', color: t.color,
                padding: '2px 8px', borderRadius: 10, fontWeight: 700,
              }}>{summary[t.value]}</span>
            )}
          </button>
        ))}
      </div>

      <div className="panel-card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>⏳ Yükleniyor...</div>
        ) : reviews.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>⭐</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-main)' }}>
              Bu durumda yorum yok
            </div>
            <div style={{ fontSize: 13, marginTop: 6 }}>
              "🧪 Demo Yorum Ekle" ile test verisi oluştur.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {reviews.map(r => (
              <div key={r.id} style={{
                padding: 18, borderBottom: '1px solid var(--border-color)',
                display: 'grid', gridTemplateColumns: '1fr auto', gap: 16,
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <Stars rating={r.rating} />
                    <strong>{r.customerName}</strong>
                    {r.customerEmail && (
                      <small style={{ color: 'var(--text-muted)' }}>· {r.customerEmail}</small>
                    )}
                    {r.aiSpamScore !== null && r.aiSpamScore > 0 && (
                      <span style={{
                        background: r.aiSpamScore >= 50 ? '#FEE2E2' : '#FEF3C7',
                        color: r.aiSpamScore >= 50 ? '#991B1B' : '#92400E',
                        padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                      }}>🤖 Spam %{r.aiSpamScore}</span>
                    )}
                  </div>
                  {r.title && <div style={{ fontWeight: 700, marginBottom: 4 }}>{r.title}</div>}
                  <div style={{ fontSize: 14, color: 'var(--text-main)', lineHeight: 1.5 }}>{r.content}</div>
                  {(() => {
                    let imgs: string[] = []
                    try { imgs = r.images ? JSON.parse(r.images) : [] } catch { imgs = [] }
                    return imgs.length > 0 ? (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                        {imgs.map((src, i) => (
                          <a key={i} href={src} target="_blank" rel="noreferrer">
                            <img src={src} alt="" style={{
                              width: 64, height: 64, objectFit: 'cover', borderRadius: 6,
                              border: '1px solid var(--border-color)',
                            }} />
                          </a>
                        ))}
                      </div>
                    ) : null
                  })()}
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, display: 'flex', gap: 12 }}>
                    <span>📦 {r.productTitle}</span>
                    <span>📅 {formatDate(r.createdAt)}</span>
                    {r.reviewedAt && <span>✓ {formatDate(r.reviewedAt)}</span>}
                  </div>
                  {r.rejectionReason && (
                    <div style={{ marginTop: 8, padding: 8, background: '#FEF2F2', borderRadius: 6, fontSize: 12, color: '#991B1B' }}>
                      <strong>Red sebebi:</strong> {r.rejectionReason}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 130 }}>
                  {activeTab === 'PENDING' && (
                    <>
                      <button className="btn-primary" style={{ padding: '6px 10px', fontSize: 12 }}
                        disabled={busy === r.id}
                        onClick={() => setStatus(r.id, 'APPROVED')}>✅ Onayla</button>
                      <button className="btn-secondary" style={{ padding: '6px 10px', fontSize: 12, color: '#DC2626', borderColor: '#FCA5A5' }}
                        disabled={busy === r.id}
                        onClick={() => {
                          const reason = prompt('Red sebebi (opsiyonel):')
                          setStatus(r.id, 'REJECTED', reason || undefined)
                        }}>❌ Reddet</button>
                      <button className="btn-secondary" style={{ padding: '6px 10px', fontSize: 12 }}
                        disabled={busy === r.id}
                        onClick={() => setStatus(r.id, 'SPAM')}>🚫 Spam</button>
                    </>
                  )}
                  {activeTab !== 'PENDING' && (
                    <button className="btn-secondary" style={{ padding: '6px 10px', fontSize: 12 }}
                      disabled={busy === r.id}
                      onClick={() => setStatus(r.id, 'PENDING')}>↩️ Tekrar İncele</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
