'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/shopify-data'

interface Customer {
  id: string
  displayName: string
  email: string | null
  phone: string | null
  note: string | null
  tags: string[]
  ordersCount: number
  totalSpent: string
  currency: string
  createdAt: string
  state: string
  addresses: Array<{
    id: string
    address1: string | null
    city: string | null
    province: string | null
    zip: string | null
    country: string | null
  }>
  recentOrders: Array<{
    id: string
    name: string
    createdAt: string
    total: string
    fulfillmentStatus: string | null
    financialStatus: string | null
  }>
}

export default function CustomerDetailPage() {
  const router = useRouter()
  const params = useParams()
  const customerId = decodeURIComponent(params.id as string)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [carts, setCarts] = useState<{ live: any[]; abandoned: any[] } | null>(null)
  const [loyalty, setLoyalty] = useState<{ account: any; transactions: any[] } | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/shopify/customers/${encodeURIComponent(customerId)}`)
      const data = await res.json()
      if (data.success) setCustomer(data.customer)
      else setError(data.message)
    } catch (e: any) { setError(e?.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [customerId])

  // Sepetler (canlı + terk edilmiş) — müşteri yüklenince
  useEffect(() => {
    if (!customer) return
    const q = customer.email ? `?email=${encodeURIComponent(customer.email)}` : ''
    fetch(`/api/shopify/customers/${encodeURIComponent(customerId)}/carts${q}`)
      .then(r => r.json())
      .then(d => { if (d.success) setCarts({ live: d.live || [], abandoned: d.abandoned || [] }) })
      .catch(() => {})
  }, [customer, customerId])

  // Sadakat puanı hesabı
  async function loadLoyalty() {
    if (!customer) return
    const params = new URLSearchParams()
    if (customer.email) params.set('email', customer.email)
    if (customer.displayName) params.set('name', customer.displayName)
    const res = await fetch(`/api/loyalty/account/${encodeURIComponent(customerId)}?${params.toString()}`)
    const d = await res.json()
    if (d.success) setLoyalty({ account: d.account, transactions: d.transactions })
  }
  useEffect(() => { loadLoyalty() }, [customer, customerId])

  async function loyaltyAction(action: 'adjust' | 'redeem') {
    let body: any = { action }
    if (action === 'adjust') {
      const p = prompt('Eklenecek/çıkarılacak puan (örn: 100 veya -50):')
      if (!p) return
      body.points = parseInt(p, 10); body.reason = prompt('Sebep (opsiyonel):') || 'Manuel düzeltme'
    } else {
      const p = prompt(`Kullanılacak puan (bakiye: ${loyalty?.account.balance}):`)
      if (!p) return
      body.points = parseInt(p, 10)
    }
    const res = await fetch(`/api/loyalty/account/${encodeURIComponent(customerId)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    const d = await res.json()
    alert((d.success ? '✅ ' : '❌ ') + d.message)
    if (d.success) await loadLoyalty()
  }

  if (loading) {
    return (
      <div className="page-content">
        <div className="panel-card">
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>⏳ Yükleniyor...</div>
        </div>
      </div>
    )
  }

  if (error || !customer) {
    return (
      <div className="page-content">
        <div className="panel-card" style={{ borderLeft: '4px solid #DC2626' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#DC2626' }}>⚠️ Müşteri yüklenemedi</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>{error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-content">
      <div className="product-header">
        <div>
          <button onClick={() => router.push('/customers')}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12, marginBottom: 4 }}>
            ← Müşteriler
          </button>
          <h1 className="page-title">{customer.displayName}</h1>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            {customer.email && <>📧 {customer.email}</>}
            {customer.phone && <> · 📞 {customer.phone}</>}
            <> · Kayıt: {formatDate(customer.createdAt)}</>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <div className="panel-card">
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Toplam Sipariş</div>
          <div style={{ fontSize: 32, fontWeight: 800, marginTop: 4 }}>{customer.ordersCount}</div>
        </div>
        <div className="panel-card">
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Toplam Harcama</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#059669', marginTop: 4 }}>
            {formatCurrency(customer.totalSpent, customer.currency)}
          </div>
        </div>
        <div className="panel-card">
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Ort. Sipariş</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#2563EB', marginTop: 4 }}>
            {customer.ordersCount > 0
              ? formatCurrency(parseFloat(customer.totalSpent) / customer.ordersCount, customer.currency)
              : '—'}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Son Siparişler */}
          <div className="panel-card">
            <div className="settings-section-title">Son Siparişler</div>
            {customer.recentOrders.length === 0 ? (
              <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>
                Henüz sipariş yok.
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Sipariş</th>
                    <th>Tarih</th>
                    <th>Durum</th>
                    <th>Tutar</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.recentOrders.map(o => (
                    <tr key={o.id} style={{ cursor: 'pointer' }}
                      onClick={() => router.push(`/orders/${encodeURIComponent(o.id)}`)}>
                      <td><strong style={{ color: '#2563EB' }}>{o.name}</strong></td>
                      <td><small>{formatDate(o.createdAt)}</small></td>
                      <td>
                        <span className={`status-badge ${o.fulfillmentStatus === 'FULFILLED' ? 'delivered' : 'pending'}`}>
                          {o.fulfillmentStatus || '—'}
                        </span>
                      </td>
                      <td><strong>{formatCurrency(o.total, customer.currency)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Sepetler — canlı + terk edilmiş */}
          <div className="panel-card">
            <div className="settings-section-title">🛒 Sepetler</div>
            {!carts ? (
              <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: 10 }}>⏳ Yükleniyor...</div>
            ) : carts.live.length === 0 && carts.abandoned.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: 10 }}>
                Bu müşteriye ait sepet bulunamadı. Canlı sepet için mağazaya <code>cart-tracker.js</code> eklenmeli.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {carts.live.map((c) => (
                  <CartBlock key={c.id} title="🟢 Canlı Sepet" sub={`Güncellendi: ${formatDate(c.updatedAt)}`}
                    lines={c.lines} total={c.total} currency={c.currency} accent="#059669" />
                ))}
                {carts.abandoned.map((c) => (
                  <CartBlock key={c.id} title="🛒 Terk Edilmiş Sepet" sub={`Terk: ${formatDate(c.createdAt)}`}
                    lines={c.lines} total={c.total} currency={c.currency} accent="#D97706" url={c.url} />
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Sadakat Puanı */}
          {loyalty && (
            <div className="panel-card" style={{ borderTop: '3px solid #7C3AED' }}>
              <div className="settings-section-title">🎁 Sadakat Puanı</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#7C3AED' }}>{loyalty.account.balance.toLocaleString('tr-TR')}</div>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>puan</span>
                <span className="status-badge" style={{
                  marginLeft: 'auto',
                  background: (loyalty.account.tier === 'GOLD' ? '#D97706' : loyalty.account.tier === 'SILVER' ? '#6B7280' : '#B45309') + '22',
                  color: loyalty.account.tier === 'GOLD' ? '#D97706' : loyalty.account.tier === 'SILVER' ? '#6B7280' : '#B45309',
                }}>{loyalty.account.tier === 'GOLD' ? '🥇 Altın' : loyalty.account.tier === 'SILVER' ? '🥈 Gümüş' : '🥉 Bronz'}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                Toplam kazanılan: {loyalty.account.totalEarned.toLocaleString('tr-TR')} · Kullanılan: {loyalty.account.totalRedeemed.toLocaleString('tr-TR')}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button className="btn-secondary" style={{ fontSize: 12 }} onClick={() => loyaltyAction('adjust')}>± Puan Ayarla</button>
                <button className="btn-primary" style={{ fontSize: 12 }} onClick={() => loyaltyAction('redeem')} disabled={loyalty.account.balance <= 0}>🎟 Kupona Çevir</button>
              </div>
              {loyalty.transactions.length > 0 && (
                <div style={{ marginTop: 12, borderTop: '1px solid var(--border-color)', paddingTop: 10 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Son işlemler</div>
                  {loyalty.transactions.slice(0, 6).map((t: any) => (
                    <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0' }}>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {({ EARN: '⭐ Kazanım', REDEEM: '🎟 Kullanım', ADJUST: '✏️ Düzeltme', SIGNUP: '🎉 Bonus' } as any)[t.type] || t.type}
                        {t.orderName ? ` · ${t.orderName}` : ''}{t.code ? ` · ${t.code}` : ''}
                      </span>
                      <strong style={{ color: t.points >= 0 ? '#059669' : '#DC2626' }}>{t.points > 0 ? '+' : ''}{t.points}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Adresler */}
          <div className="panel-card">
            <div className="settings-section-title">Adresler</div>
            {customer.addresses.length === 0 ? (
              <small style={{ color: 'var(--text-muted)' }}>Adres kaydı yok</small>
            ) : (
              customer.addresses.map(a => (
                <div key={a.id} style={{ fontSize: 13, lineHeight: 1.6, padding: 10, background: 'var(--hover-bg)', borderRadius: 8, marginBottom: 8 }}>
                  {a.address1 && <div>{a.address1}</div>}
                  <div>
                    {[a.zip, a.city, a.province].filter(Boolean).join(' ')}
                  </div>
                  {a.country && <div style={{ color: 'var(--text-muted)' }}>{a.country}</div>}
                </div>
              ))
            )}
          </div>

          {/* Etiketler */}
          {customer.tags.length > 0 && (
            <div className="panel-card">
              <div className="settings-section-title">Etiketler</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {customer.tags.map(t => (
                  <span key={t} style={{
                    background: 'var(--hover-bg)', padding: '4px 10px',
                    borderRadius: 6, fontSize: 11,
                  }}>{t}</span>
                ))}
              </div>
            </div>
          )}

          {customer.note && (
            <div className="panel-card">
              <div className="settings-section-title">Not</div>
              <div style={{ fontSize: 13 }}>{customer.note}</div>
            </div>
          )}

          <div className="panel-card" style={{ background: 'var(--hover-bg)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              <strong>State:</strong> {customer.state}<br />
              <strong>Shopify ID:</strong>
              <div style={{ fontFamily: 'monospace', fontSize: 10, wordBreak: 'break-all', marginTop: 4 }}>
                {customer.id}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function CartBlock({ title, sub, lines, total, currency, accent, url }: {
  title: string; sub: string; lines: any[]; total: number; currency: string; accent: string; url?: string | null
}) {
  return (
    <div style={{ border: '1px solid var(--border-color)', borderLeft: `4px solid ${accent}`, borderRadius: 8, padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <strong style={{ fontSize: 13 }}>{title}</strong>
        <small style={{ color: 'var(--text-muted)' }}>{sub}</small>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {lines.map((l: any, i: number) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 4, flexShrink: 0, overflow: 'hidden', background: 'var(--hover-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {l.image ? <img src={l.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📦'}
            </div>
            <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.title}</div>
            <span style={{ color: 'var(--text-muted)' }}>×{l.quantity}</span>
            <span style={{ fontWeight: 600 }}>{formatCurrency(l.price, currency)}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-color)' }}>
        <strong style={{ fontSize: 13 }}>Toplam: {formatCurrency(total, currency)}</strong>
        {url && <a href={url} target="_blank" rel="noreferrer" className="btn-secondary" style={{ fontSize: 11, padding: '4px 8px', textDecoration: 'none' }}>🔗 Sepete Git</a>}
      </div>
    </div>
  )
}
