'use client'

import { useEffect, useState } from 'react'

interface Discount {
  id: string
  title: string
  code: string | null
  status: string
  type: 'CODE' | 'AUTOMATIC'
  startsAt: string | null
  endsAt: string | null
  usageCount: number
  summary: string
}

export default function DiscountsPage() {
  const [discounts, setDiscounts] = useState<Discount[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  // Yeni indirim formu
  const [code, setCode] = useState('')
  const [title, setTitle] = useState('')
  const [mode, setMode] = useState<'percent' | 'fixed'>('percent')
  const [percentage, setPercentage] = useState('20')
  const [fixedAmount, setFixedAmount] = useState('100')
  const [endsAt, setEndsAt] = useState('')
  const [usageLimit, setUsageLimit] = useState('')
  const [appliesOncePerCustomer, setAppliesOncePerCustomer] = useState(false)
  const [creating, setCreating] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/shopify/discounts')
      const data = await res.json()
      if (data.success) setDiscounts(data.discounts || [])
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function createDiscount() {
    if (!code || !title) { alert('Kod ve başlık gerekli'); return }
    setCreating(true)
    try {
      const body: any = {
        code, title,
        endsAt: endsAt ? new Date(endsAt).toISOString() : null,
        usageLimit: usageLimit ? parseInt(usageLimit, 10) : null,
        appliesOncePerCustomer,
      }
      if (mode === 'percent') body.percentage = parseFloat(percentage)
      else body.fixedAmount = parseFloat(fixedAmount)

      const res = await fetch('/api/shopify/discounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.success) {
        alert(`✅ "${code}" kuponu oluşturuldu!`)
        setShowCreate(false)
        setCode(''); setTitle(''); setEndsAt(''); setUsageLimit('')
        await load()
      } else alert('❌ ' + data.message)
    } finally { setCreating(false) }
  }

  async function removeDiscount(id: string, title: string) {
    if (!confirm(`"${title}" indirimi silinecek. Emin misin?`)) return
    await fetch(`/api/shopify/discounts/${encodeURIComponent(id)}`, { method: 'DELETE' })
    await load()
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code)
      .then(() => alert(`📋 "${code}" kopyalandı!`))
  }

  return (
    <div className="page-content">
      <div className="product-header">
        <h1 className="page-title">Kuponlar & İndirimler</h1>
        <div className="product-actions-right">
          <button className="btn-primary" onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? '✕ İptal' : '➕ Yeni Kupon'}
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="panel-card" style={{ borderLeft: '4px solid #2563EB' }}>
          <div className="settings-section-title">Yeni İndirim Kuponu</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            <div>
              <label className="form-label">Kupon Kodu (örn: YAZ20)</label>
              <input className="form-select" style={{ width: '100%' }} value={code}
                onChange={e => setCode(e.target.value.toUpperCase())} />
            </div>
            <div>
              <label className="form-label">Başlık</label>
              <input className="form-select" style={{ width: '100%' }} value={title}
                onChange={e => setTitle(e.target.value)} placeholder="Yaz İndirimi" />
            </div>
            <div>
              <label className="form-label">İndirim Tipi</label>
              <select className="form-select" style={{ width: '100%' }} value={mode}
                onChange={e => setMode(e.target.value as 'percent' | 'fixed')}>
                <option value="percent">Yüzde (%)</option>
                <option value="fixed">Sabit Tutar</option>
              </select>
            </div>
            <div>
              <label className="form-label">{mode === 'percent' ? 'Yüzde (%)' : 'Tutar (₺)'}</label>
              <input type="number" min="0" className="form-select" style={{ width: '100%' }}
                value={mode === 'percent' ? percentage : fixedAmount}
                onChange={e => mode === 'percent' ? setPercentage(e.target.value) : setFixedAmount(e.target.value)} />
            </div>
            <div>
              <label className="form-label">Bitiş Tarihi (opsiyonel)</label>
              <input type="date" className="form-select" style={{ width: '100%' }}
                value={endsAt} onChange={e => setEndsAt(e.target.value)} />
            </div>
            <div>
              <label className="form-label">Kullanım Limiti (opsiyonel)</label>
              <input type="number" min="1" className="form-select" style={{ width: '100%' }}
                value={usageLimit} onChange={e => setUsageLimit(e.target.value)}
                placeholder="Sınırsız" />
            </div>
          </div>
          <label style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center', cursor: 'pointer' }}>
            <input type="checkbox" checked={appliesOncePerCustomer}
              onChange={e => setAppliesOncePerCustomer(e.target.checked)} />
            <span style={{ fontSize: 13 }}>Her müşteri sadece 1 kez kullanabilir</span>
          </label>
          <button className="btn-primary" style={{ marginTop: 14 }} disabled={creating} onClick={createDiscount}>
            {creating ? '⏳ Oluşturuluyor...' : '💾 Kuponu Oluştur'}
          </button>
        </div>
      )}

      <div className="panel-card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>⏳ Yükleniyor...</div>
        ) : discounts.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>💰</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-main)' }}>
              Henüz indirim kuponu yok
            </div>
            <div style={{ fontSize: 13, marginTop: 6 }}>
              Yukarıdan "Yeni Kupon" ile başla.
            </div>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Kod / Başlık</th>
                <th>Tip</th>
                <th>İndirim</th>
                <th>Kullanım</th>
                <th>Durum</th>
                <th>Bitiş</th>
                <th style={{ textAlign: 'right' }}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {discounts.map(d => (
                <tr key={d.id}>
                  <td>
                    {d.code && (
                      <code style={{
                        background: '#EFF6FF', color: '#1D4ED8', padding: '4px 10px',
                        borderRadius: 6, fontWeight: 700, marginRight: 8, cursor: 'pointer',
                      }} onClick={() => copyCode(d.code!)}>{d.code}</code>
                    )}
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{d.title}</div>
                  </td>
                  <td>
                    <span className="badge badge-delivered">
                      {d.type === 'CODE' ? 'Kupon' : 'Otomatik'}
                    </span>
                  </td>
                  <td><small>{d.summary || '—'}</small></td>
                  <td>{d.usageCount}</td>
                  <td>
                    <span className={`status-badge ${d.status === 'ACTIVE' ? 'delivered' : 'pending'}`}>
                      {d.status}
                    </span>
                  </td>
                  <td>
                    <small>{d.endsAt ? new Date(d.endsAt).toLocaleDateString('tr-TR') : '—'}</small>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn-secondary" style={{ padding: '6px 10px', fontSize: 12, color: '#DC2626', borderColor: '#FCA5A5' }}
                      onClick={() => removeDiscount(d.id, d.title)}>🗑</button>
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
