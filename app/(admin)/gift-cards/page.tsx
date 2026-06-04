'use client'

import { useEffect, useState } from 'react'
import { formatCurrency } from '@/lib/shopify-data'

interface GiftCard {
  id: string
  maskedCode: string
  initialValue: string
  balance: string
  currency: string
  customerName: string
  enabled: boolean
  expiresOn: string | null
  createdAt: string
}

export default function GiftCardsPage() {
  const [cards, setCards] = useState<GiftCard[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  const [initialValue, setInitialValue] = useState('500')
  const [note, setNote] = useState('')
  const [expiresOn, setExpiresOn] = useState('')
  const [creating, setCreating] = useState(false)
  const [createdCode, setCreatedCode] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/shopify/gift-cards')
      const data = await res.json()
      if (data.success) setCards(data.cards || [])
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function create() {
    if (!initialValue || parseFloat(initialValue) <= 0) { alert('Geçerli tutar gir'); return }
    setCreating(true)
    try {
      const res = await fetch('/api/shopify/gift-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initialValue, note,
          expiresOn: expiresOn ? expiresOn : null,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setCreatedCode(data.giftCardCode || '')
        setNote(''); setExpiresOn('')
        await load()
      } else alert('❌ ' + data.message)
    } finally { setCreating(false) }
  }

  return (
    <div className="page-content">
      <div className="product-header">
        <h1 className="page-title">Hediye Kartları</h1>
        <div className="product-actions-right">
          <button className="btn-primary" onClick={() => { setShowCreate(!showCreate); setCreatedCode(null) }}>
            {showCreate ? '✕ İptal' : '🎁 Yeni Hediye Kartı'}
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="panel-card" style={{ borderLeft: '4px solid #8B5CF6' }}>
          <div className="settings-section-title">Yeni Hediye Kartı</div>

          {createdCode ? (
            <div style={{
              padding: 20, background: '#ECFDF5', border: '1px solid #A7F3D0',
              borderRadius: 10, textAlign: 'center',
            }}>
              <div style={{ fontSize: 13, color: '#065F46', marginBottom: 8 }}>
                ✅ Kart oluşturuldu! Bu kod sadece BİR KEZ gösteriliyor:
              </div>
              <code style={{
                fontSize: 22, fontWeight: 700, color: '#065F46',
                background: '#FFF', padding: '10px 20px', borderRadius: 8, display: 'inline-block',
                letterSpacing: 2,
              }}>{createdCode}</code>
              <div style={{ marginTop: 12 }}>
                <button className="btn-secondary" onClick={() => {
                  navigator.clipboard.writeText(createdCode); alert('Kopyalandı!')
                }}>📋 Kopyala</button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                <div>
                  <label className="form-label">Başlangıç Tutarı (₺)</label>
                  <input type="number" min="1" step="0.01" className="form-select" style={{ width: '100%' }}
                    value={initialValue} onChange={e => setInitialValue(e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Son Kullanma Tarihi (opsiyonel)</label>
                  <input type="date" className="form-select" style={{ width: '100%' }}
                    value={expiresOn} onChange={e => setExpiresOn(e.target.value)} />
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <label className="form-label">Not</label>
                <input className="form-select" style={{ width: '100%' }}
                  value={note} onChange={e => setNote(e.target.value)} placeholder="Doğum günü hediyesi vs." />
              </div>
              <button className="btn-primary" style={{ marginTop: 14 }} disabled={creating} onClick={create}>
                {creating ? '⏳ Oluşturuluyor...' : '🎁 Kart Oluştur'}
              </button>
            </>
          )}
        </div>
      )}

      <div className="panel-card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>⏳ Yükleniyor...</div>
        ) : cards.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎁</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-main)' }}>
              Henüz hediye kartı yok
            </div>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Kod</th>
                <th>Müşteri</th>
                <th>Başlangıç</th>
                <th>Bakiye</th>
                <th>Durum</th>
                <th>Bitiş</th>
              </tr>
            </thead>
            <tbody>
              {cards.map(c => (
                <tr key={c.id}>
                  <td><code style={{ background: 'var(--hover-bg)', padding: '4px 10px', borderRadius: 4 }}>{c.maskedCode}</code></td>
                  <td>{c.customerName}</td>
                  <td>{formatCurrency(c.initialValue, c.currency)}</td>
                  <td><strong style={{ color: '#059669' }}>{formatCurrency(c.balance, c.currency)}</strong></td>
                  <td>
                    <span className={`status-badge ${c.enabled ? 'delivered' : 'cancelled'}`}>
                      {c.enabled ? 'Aktif' : 'Devre Dışı'}
                    </span>
                  </td>
                  <td><small>{c.expiresOn ? new Date(c.expiresOn).toLocaleDateString('tr-TR') : '—'}</small></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
