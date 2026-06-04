'use client'

import { useEffect, useState } from 'react'

interface PriceList {
  id: number; name: string
  segmentType: string; segmentValue: string | null
  adjustmentType: string; adjustmentValue: string
  active: boolean; startsAt: string | null; endsAt: string | null
  itemCount: number; createdAt: string
}

const SEGMENT_LABEL: Record<string, string> = {
  all: '👥 Tüm Müşteriler',
  vip: '👑 VIP Müşteriler',
  wholesale: '🏢 Toptan',
  channel: '🛒 Satış Kanalı',
  custom: '⚙️ Özel',
}

const ADJUST_LABEL: Record<string, string> = {
  percent_off: '% İndirim',
  fixed_off: '₺ Sabit İndirim',
  fixed_price: '🏷 Sabit Fiyat',
}

export default function PriceListPage() {
  const [lists, setLists] = useState<PriceList[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  const [name, setName] = useState('')
  const [segmentType, setSegmentType] = useState('all')
  const [adjustmentType, setAdjustmentType] = useState('percent_off')
  const [adjustmentValue, setAdjustmentValue] = useState('10')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')

  async function load() {
    setLoading(true)
    const res = await fetch('/api/price-lists')
    const data = await res.json()
    if (data.success) setLists(data.lists || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function create() {
    if (!name || !adjustmentValue) return
    const res = await fetch('/api/price-lists', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, segmentType, adjustmentType,
        adjustmentValue: parseFloat(adjustmentValue),
        startsAt: startsAt || null, endsAt: endsAt || null,
      }),
    })
    const data = await res.json()
    if (data.success) {
      setShowCreate(false); setName(''); setAdjustmentValue('10'); setStartsAt(''); setEndsAt('')
      await load()
    }
  }

  async function toggleActive(id: number, active: boolean) {
    await fetch(`/api/price-lists/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !active }),
    })
    await load()
  }

  async function remove(id: number, name: string) {
    if (!confirm(`"${name}" fiyat listesi silinecek. Emin misin?`)) return
    await fetch(`/api/price-lists/${id}`, { method: 'DELETE' })
    await load()
  }

  return (
    <div className="page-content">
      <div className="product-header">
        <h1 className="page-title">🏷 Fiyat Listeleri</h1>
        <button className="btn-primary" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? '✕ İptal' : '➕ Yeni Fiyat Listesi'}
        </button>
      </div>

      {showCreate && (
        <div className="panel-card" style={{ borderLeft: '4px solid #7C3AED' }}>
          <div className="settings-section-title">Yeni Fiyat Listesi</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
            <div>
              <label className="form-label">Liste Adı *</label>
              <input className="form-select" style={{ width: '100%' }}
                value={name} onChange={e => setName(e.target.value)}
                placeholder="Örn: Yaz Kampanyası %20 İndirim" />
            </div>
            <div>
              <label className="form-label">Hedef Segment</label>
              <select className="form-select" style={{ width: '100%' }}
                value={segmentType} onChange={e => setSegmentType(e.target.value)}>
                {Object.entries(SEGMENT_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">İndirim Tipi</label>
              <select className="form-select" style={{ width: '100%' }}
                value={adjustmentType} onChange={e => setAdjustmentType(e.target.value)}>
                {Object.entries(ADJUST_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">
                {adjustmentType === 'percent_off' ? 'Yüzde (%)' : adjustmentType === 'fixed_off' ? 'İndirim Tutarı (₺)' : 'Sabit Fiyat (₺)'}
              </label>
              <input type="number" min={0} step={0.01} className="form-select" style={{ width: '100%' }}
                value={adjustmentValue} onChange={e => setAdjustmentValue(e.target.value)} />
            </div>
            <div>
              <label className="form-label">Başlangıç (opsiyonel)</label>
              <input type="date" className="form-select" style={{ width: '100%' }}
                value={startsAt} onChange={e => setStartsAt(e.target.value)} />
            </div>
            <div>
              <label className="form-label">Bitiş (opsiyonel)</label>
              <input type="date" className="form-select" style={{ width: '100%' }}
                value={endsAt} onChange={e => setEndsAt(e.target.value)} />
            </div>
          </div>
          <button className="btn-primary" style={{ marginTop: 14 }} onClick={create}>
            💾 Liste Oluştur
          </button>
        </div>
      )}

      <div className="panel-card" style={{ padding: 0 }}>
        {loading ? <div style={{ padding: 40, textAlign: 'center' }}>⏳ Yükleniyor...</div>
          : lists.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🏷</div>
              <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>Henüz fiyat listesi yok</div>
              <div style={{ fontSize: 13, marginTop: 6 }}>
                B2B, VIP veya kampanya bazlı özel fiyatlar oluştur.
              </div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>Liste</th><th>Segment</th><th>İndirim</th><th>Ürün</th><th>Tarih</th><th>Durum</th><th>İşlem</th></tr>
              </thead>
              <tbody>
                {lists.map(l => (
                  <tr key={l.id}>
                    <td><strong>{l.name}</strong></td>
                    <td><small>{SEGMENT_LABEL[l.segmentType] ?? l.segmentType}</small></td>
                    <td>
                      <strong>
                        {l.adjustmentType === 'percent_off' && `% ${l.adjustmentValue}`}
                        {l.adjustmentType === 'fixed_off' && `-₺ ${l.adjustmentValue}`}
                        {l.adjustmentType === 'fixed_price' && `₺ ${l.adjustmentValue}`}
                      </strong>
                    </td>
                    <td>{l.itemCount}</td>
                    <td>
                      <small>
                        {l.startsAt ? new Date(l.startsAt).toLocaleDateString('tr-TR') : '—'} →
                        {l.endsAt ? ' ' + new Date(l.endsAt).toLocaleDateString('tr-TR') : ' süresiz'}
                      </small>
                    </td>
                    <td>
                      <button onClick={() => toggleActive(l.id, l.active)}
                        style={{
                          border: 'none', cursor: 'pointer', padding: '4px 10px',
                          borderRadius: 12, fontSize: 11, fontWeight: 700,
                          background: l.active ? '#D1FAE5' : '#F3F4F6',
                          color: l.active ? '#065F46' : '#6B7280',
                        }}>
                        {l.active ? '✓ Aktif' : '○ Pasif'}
                      </button>
                    </td>
                    <td>
                      <button className="btn-secondary" style={{ fontSize: 11, padding: '4px 10px', color: '#DC2626' }}
                        onClick={() => remove(l.id, l.name)}>🗑</button>
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
