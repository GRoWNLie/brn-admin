'use client'

import { useEffect, useState } from 'react'
import { formatDate } from '@/lib/shopify-data'

interface Transfer {
  id: number; transferNumber: string; status: string
  fromLocationName: string; toLocationName: string
  notes: string | null; createdAt: string; shippedAt: string | null; receivedAt: string | null
  items: Array<{ title: string; sku: string | null; quantity: number; receivedQty: number }>
}

interface Location { id: string; name: string }

const STATUS: Record<string, { label: string; cls: string }> = {
  DRAFT:      { label: 'Taslak', cls: 'pending' },
  IN_TRANSIT: { label: 'Yolda',  cls: 'pending' },
  RECEIVED:   { label: 'Teslim Alındı', cls: 'delivered' },
  CANCELLED:  { label: 'İptal', cls: 'cancelled' },
}

export default function TransferPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  const [fromId, setFromId] = useState('')
  const [toId, setToId] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState([{ title: '', sku: '', quantity: 1 }])

  async function load() {
    setLoading(true)
    const [tRes, lRes] = await Promise.all([
      fetch('/api/stock-transfers').then(r => r.json()),
      fetch('/api/shopify/inventory').then(r => r.json()).catch(() => ({ locations: [] })),
    ])
    if (tRes.success) setTransfers(tRes.transfers || [])
    if (lRes.success) setLocations(lRes.locations || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function create() {
    if (!fromId || !toId || fromId === toId) { alert('Kaynak ve hedef lokasyon farklı olmalı'); return }
    if (items.some(i => !i.title || i.quantity <= 0)) { alert('Geçerli kalemler gerekli'); return }

    const from = locations.find(l => l.id === fromId)
    const to = locations.find(l => l.id === toId)

    const res = await fetch('/api/stock-transfers', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fromLocationId: fromId, fromLocationName: from?.name ?? fromId,
        toLocationId: toId, toLocationName: to?.name ?? toId,
        notes, items,
      }),
    })
    const data = await res.json()
    if (data.success) {
      setShowCreate(false); setFromId(''); setToId(''); setNotes('')
      setItems([{ title: '', sku: '', quantity: 1 }])
      await load()
    } else alert(data.message)
  }

  async function setStatus(id: number, status: string) {
    await fetch(`/api/stock-transfers/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    await load()
  }

  return (
    <div className="page-content">
      <div className="product-header">
        <h1 className="page-title">🚚 Stok Transferleri</h1>
        <button className="btn-primary" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? '✕ İptal' : '➕ Yeni Transfer'}
        </button>
      </div>

      {showCreate && (
        <div className="panel-card" style={{ borderLeft: '4px solid #2563EB' }}>
          <div className="settings-section-title">Yeni Stok Transferi</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
            <div>
              <label className="form-label">Kaynak Lokasyon *</label>
              <select className="form-select" style={{ width: '100%' }}
                value={fromId} onChange={e => setFromId(e.target.value)}>
                <option value="">Seçin...</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Hedef Lokasyon *</label>
              <select className="form-select" style={{ width: '100%' }}
                value={toId} onChange={e => setToId(e.target.value)}>
                <option value="">Seçin...</option>
                {locations.filter(l => l.id !== fromId).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <strong style={{ fontSize: 13 }}>Transfer Edilecek Kalemler</strong>
              <button className="btn-secondary" style={{ fontSize: 12, padding: '4px 12px' }}
                onClick={() => setItems([...items, { title: '', sku: '', quantity: 1 }])}>➕ Kalem</button>
            </div>
            {items.map((it, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 100px 40px', gap: 8, marginBottom: 6 }}>
                <input className="form-select" placeholder="Ürün adı"
                  value={it.title} onChange={e => {
                    const next = [...items]; next[idx].title = e.target.value; setItems(next)
                  }} />
                <input className="form-select" placeholder="SKU"
                  value={it.sku} onChange={e => {
                    const next = [...items]; next[idx].sku = e.target.value; setItems(next)
                  }} />
                <input type="number" min={1} className="form-select" placeholder="Adet"
                  value={it.quantity} onChange={e => {
                    const next = [...items]; next[idx].quantity = parseInt(e.target.value) || 0; setItems(next)
                  }} />
                <button className="btn-secondary" style={{ color: '#DC2626' }}
                  onClick={() => setItems(items.filter((_, i) => i !== idx))}>🗑</button>
              </div>
            ))}
          </div>

          <textarea className="form-select" style={{ width: '100%', marginTop: 12, minHeight: 50 }}
            placeholder="Notlar..." value={notes} onChange={e => setNotes(e.target.value)} />

          <button className="btn-primary" style={{ marginTop: 14 }} onClick={create}>
            💾 Transfer Oluştur
          </button>
        </div>
      )}

      <div className="panel-card" style={{ padding: 0 }}>
        {loading ? <div style={{ padding: 40, textAlign: 'center' }}>⏳ Yükleniyor...</div>
          : transfers.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🚚</div>
              <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>Henüz transfer yok</div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>Transfer No</th><th>Kaynak</th><th>Hedef</th><th>Kalem</th><th>Durum</th><th>Tarih</th><th>İşlem</th></tr>
              </thead>
              <tbody>
                {transfers.map(t => {
                  const st = STATUS[t.status] ?? { label: t.status, cls: 'pending' }
                  return (
                    <tr key={t.id}>
                      <td><code>{t.transferNumber}</code></td>
                      <td>{t.fromLocationName}</td>
                      <td>→ {t.toLocationName}</td>
                      <td>{t.items.length}</td>
                      <td><span className={`status-badge ${st.cls}`}>{st.label}</span></td>
                      <td><small>{formatDate(t.createdAt)}</small></td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {t.status === 'DRAFT' && (
                            <button className="btn-secondary" style={{ fontSize: 11, padding: '4px 8px' }}
                              onClick={() => setStatus(t.id, 'IN_TRANSIT')}>🚚 Gönder</button>
                          )}
                          {t.status === 'IN_TRANSIT' && (
                            <button className="btn-secondary" style={{ fontSize: 11, padding: '4px 8px', color: '#059669' }}
                              onClick={() => setStatus(t.id, 'RECEIVED')}>✅ Teslim Aldım</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
      </div>
    </div>
  )
}
