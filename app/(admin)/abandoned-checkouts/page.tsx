'use client'

import { useEffect, useState } from 'react'
import { formatCurrency, formatDate } from '@/lib/shopify-data'

interface Checkout {
  id: string
  name: string
  totalPrice: string
  currency: string
  customerName: string
  email: string | null
  abandonedCheckoutUrl: string | null
  lineItemCount: number
  createdAt: string
  updatedAt: string
}

export default function AbandonedCheckoutsPage() {
  const [checkouts, setCheckouts] = useState<Checkout[]>([])
  const [loading, setLoading] = useState(true)
  const [totalValue, setTotalValue] = useState(0)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/shopify/abandoned')
      const data = await res.json()
      if (data.success) {
        setCheckouts(data.checkouts || [])
        const total = (data.checkouts || []).reduce(
          (sum: number, c: Checkout) => sum + parseFloat(c.totalPrice), 0
        )
        setTotalValue(total)
      }
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function copyRecoveryUrl(url: string) {
    navigator.clipboard.writeText(url)
      .then(() => alert('🔗 Geri kazanım URL\'i kopyalandı!'))
      .catch(() => alert('Kopyalama hatası'))
  }

  function sendRecoveryEmail(email: string, url: string, customerName: string) {
    const subject = encodeURIComponent('Sepetinizdeki ürünleri unutmayın!')
    const body = encodeURIComponent(
      `Merhaba ${customerName},\n\nSepetinizdeki ürünleri tamamlamadınız. Aşağıdaki linkten sepetinize dönerek alışverişinizi tamamlayabilirsiniz:\n\n${url}\n\nİyi alışverişler!`
    )
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`
  }

  return (
    <div className="page-content">
      <div className="product-header">
        <h1 className="page-title">Terk Edilmiş Sepetler</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <div className="panel-card">
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Toplam Sepet</div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>{checkouts.length}</div>
        </div>
        <div className="panel-card">
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Potansiyel Gelir</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#059669', marginTop: 4 }}>
            {formatCurrency(totalValue, checkouts[0]?.currency || 'TRY')}
          </div>
        </div>
        <div className="panel-card">
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Email'i Olan</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#2563EB', marginTop: 4 }}>
            {checkouts.filter(c => c.email).length}
          </div>
        </div>
      </div>

      <div className="panel-card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>⏳ Yükleniyor...</div>
        ) : checkouts.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🛒</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-main)' }}>
              Terk edilmiş sepet yok
            </div>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Checkout</th>
                <th>Müşteri</th>
                <th>Ürün</th>
                <th>Tutar</th>
                <th>Terk Edildi</th>
                <th style={{ textAlign: 'right' }}>Geri Kazan</th>
              </tr>
            </thead>
            <tbody>
              {checkouts.map(c => (
                <tr key={c.id}>
                  <td><strong>{c.name}</strong></td>
                  <td>
                    <div className="customer-cell">
                      <span className="customer-name">{c.customerName}</span>
                      {c.email && <span className="customer-email">{c.email}</span>}
                    </div>
                  </td>
                  <td><span className="badge badge-delivered">{c.lineItemCount} ürün</span></td>
                  <td><strong>{formatCurrency(c.totalPrice, c.currency)}</strong></td>
                  <td><small>{formatDate(c.updatedAt)}</small></td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      {c.abandonedCheckoutUrl && (
                        <button className="btn-secondary" style={{ padding: '6px 10px', fontSize: 12 }}
                          onClick={() => copyRecoveryUrl(c.abandonedCheckoutUrl!)}>📋 URL</button>
                      )}
                      {c.email && c.abandonedCheckoutUrl && (
                        <button className="btn-secondary" style={{ padding: '6px 10px', fontSize: 12, color: '#2563EB', borderColor: '#BFDBFE' }}
                          onClick={() => sendRecoveryEmail(c.email!, c.abandonedCheckoutUrl!, c.customerName)}>📧 Email Yaz</button>
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
