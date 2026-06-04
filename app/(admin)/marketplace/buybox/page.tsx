'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const MPS = [
  { code: 'TRENDYOL', name: 'Trendyol' },
  { code: 'HEPSIBURADA', name: 'Hepsiburada' },
  { code: 'AMAZON', name: 'Amazon' },
  { code: 'ETSY', name: 'Etsy' },
]

interface Listing {
  id: number; sku: string | null; barcode: string | null; title: string | null
  ourPrice: number | null; buyboxPrice: number | null; buyboxWinner: boolean | null
  sellerCount: number | null; buyboxCheckedAt: string | null
}

export default function BuyboxPage() {
  const [mp, setMp] = useState('TRENDYOL')
  const [rows, setRows] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [q, setQ] = useState('')

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/marketplace/${mp}?resource=buybox`)
    const data = await res.json()
    if (data.success) setRows(data.listings)
    setLoading(false)
  }
  useEffect(() => { load() }, [mp])

  async function fetchBuybox() {
    setBusy(true); setMsg(null)
    try {
      const res = await fetch(`/api/marketplace/${mp}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'buybox' }),
      })
      const data = await res.json()
      setMsg(data.message)
      await load()
    } finally { setBusy(false) }
  }

  const filtered = rows.filter(r =>
    !q || (r.title || '').toLowerCase().includes(q.toLowerCase()) || (r.sku || '').toLowerCase().includes(q.toLowerCase()))

  const winners = rows.filter(r => r.buyboxWinner === true).length
  const losers = rows.filter(r => r.buyboxWinner === false).length
  const unknown = rows.filter(r => r.buyboxWinner === null || r.buyboxWinner === undefined).length

  return (
    <div className="page-content">
      <div className="product-header">
        <h1 className="page-title">📊 Buybox Takip</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/marketplace" className="btn-secondary" style={{ textDecoration: 'none' }}>← Pazaryerleri</Link>
          <button className="btn-primary" onClick={fetchBuybox} disabled={busy}>
            {busy ? '⏳ Çekiliyor...' : '🔄 Buybox Verisini Çek'}
          </button>
        </div>
      </div>

      <div className="panel-card" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <select className="form-select" value={mp} onChange={e => setMp(e.target.value)} style={{ minWidth: 160 }}>
          {MPS.map(m => <option key={m.code} value={m.code}>{m.name}</option>)}
        </select>
        <input className="form-select" style={{ flex: 1, minWidth: 200 }} placeholder="Ürün / SKU ara..."
          value={q} onChange={e => setQ(e.target.value)} />
        {msg && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{msg}</span>}
      </div>

      <div className="dashboard-grid-2" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <div className="panel-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#059669' }}>Buybox Kazanan</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#059669' }}>{winners}</div>
        </div>
        <div className="panel-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#DC2626' }}>Kaybeden</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#DC2626' }}>{losers}</div>
        </div>
        <div className="panel-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Veri Yok</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-muted)' }}>{unknown}</div>
        </div>
      </div>

      <div className="panel-card" style={{ padding: 0 }}>
        {loading ? <div style={{ padding: 40, textAlign: 'center' }}>⏳ Yükleniyor...</div>
          : filtered.length === 0 ? (
            <div style={{ padding: 50, textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>📊</div>
              <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>Buybox verisi yok</div>
              <div style={{ fontSize: 13, marginTop: 6 }}>Önce "🔄 Buybox Verisini Çek" ile pazaryerinden veri alın.</div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>Ürün</th><th>SKU</th><th>Bizim Fiyat</th><th>Buybox Fiyat</th><th>Durum</th><th>Satıcı</th><th>Kontrol</th></tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id}>
                    <td>{r.title || '—'}</td>
                    <td><code style={{ fontSize: 11 }}>{r.sku || '—'}</code></td>
                    <td>{r.ourPrice != null ? `₺${r.ourPrice.toFixed(2)}` : '—'}</td>
                    <td>{r.buyboxPrice != null ? `₺${r.buyboxPrice.toFixed(2)}` : '—'}</td>
                    <td>
                      {r.buyboxWinner === true
                        ? <span className="status-badge delivered">🏆 Kazandın</span>
                        : r.buyboxWinner === false
                          ? <span className="status-badge cancelled">Kaybettin</span>
                          : <span className="status-badge pending">—</span>}
                    </td>
                    <td>{r.sellerCount ?? '—'}</td>
                    <td><small>{r.buyboxCheckedAt ? new Date(r.buyboxCheckedAt).toLocaleString('tr-TR') : '—'}</small></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      <div className="panel-card" style={{ background: 'var(--hover-bg)' }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          ℹ️ Trendyol standart API'sinde rakip/buybox kazanan fiyatı doğrudan gelmez; bu yüzden "Bizim Fiyat" dolar,
          "Buybox Fiyat/Durum" rekabet verisi erişimi (Trendyol fiyat rekabeti / harici fiyat kaynağı) bağlanınca dolacaktır.
          Mimari hazır — veri kaynağı eklenince tablo otomatik dolar.
        </div>
      </div>
    </div>
  )
}
