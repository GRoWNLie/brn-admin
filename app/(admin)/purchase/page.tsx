'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/shopify-data'

interface Supplier { id: number; name: string; email: string | null; phone: string | null }
interface POItem { id?: number; title: string; sku?: string; quantity: number; unitCost: number; receivedQty?: number }
interface PO {
  id: number; poNumber: string; status: string; totalAmount: string; currency: string
  expectedAt: string | null; receivedAt: string | null; createdAt: string; notes: string | null
  supplier: Supplier; items: POItem[]
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  DRAFT:     { label: 'Taslak',       cls: 'pending' },
  ORDERED:   { label: 'Sipariş Edildi', cls: 'pending' },
  PARTIAL:   { label: 'Kısmi Geldi',  cls: 'pending' },
  RECEIVED:  { label: 'Teslim Alındı',cls: 'delivered' },
  CANCELLED: { label: 'İptal',         cls: 'cancelled' },
}

export default function PurchasePage() {
  const router = useRouter()
  const [orders, setOrders] = useState<PO[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showSupplier, setShowSupplier] = useState(false)

  // Form state
  const [supplierId, setSupplierId] = useState('')
  const [expectedAt, setExpectedAt] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<POItem[]>([{ title: '', quantity: 1, unitCost: 0 }])

  // Supplier form
  const [supName, setSupName] = useState('')
  const [supEmail, setSupEmail] = useState('')
  const [supPhone, setSupPhone] = useState('')

  async function load() {
    setLoading(true)
    const [oRes, sRes] = await Promise.all([
      fetch('/api/purchase-orders').then(r => r.json()),
      fetch('/api/suppliers').then(r => r.json()),
    ])
    if (oRes.success) setOrders(oRes.orders || [])
    if (sRes.success) setSuppliers(sRes.suppliers || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function createSupplier() {
    if (!supName) return
    const res = await fetch('/api/suppliers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: supName, email: supEmail, phone: supPhone }),
    })
    const data = await res.json()
    if (data.success) {
      setSupName(''); setSupEmail(''); setSupPhone('')
      setShowSupplier(false)
      await load()
      setSupplierId(String(data.supplier.id))
    }
  }

  async function createOrder() {
    if (!supplierId || items.some(i => !i.title || i.quantity <= 0)) {
      alert('Tedarikçi ve geçerli kalemler gerekli'); return
    }
    const res = await fetch('/api/purchase-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supplierId: Number(supplierId), expectedAt, notes, items }),
    })
    const data = await res.json()
    if (data.success) {
      setShowCreate(false); setSupplierId(''); setExpectedAt(''); setNotes('')
      setItems([{ title: '', quantity: 1, unitCost: 0 }])
      await load()
    } else alert('Hata: ' + data.message)
  }

  async function setStatus(id: number, status: string) {
    await fetch(`/api/purchase-orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    await load()
  }

  const total = items.reduce((s, i) => s + i.quantity * i.unitCost, 0)

  return (
    <div className="page-content">
      <div className="product-header">
        <h1 className="page-title">📦 Satın Alma</h1>
        <div className="product-actions-right" style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" onClick={() => setShowSupplier(!showSupplier)}>👥 Tedarikçi Ekle</button>
          <button className="btn-primary" onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? '✕ İptal' : '➕ Yeni Sipariş'}
          </button>
        </div>
      </div>

      {showSupplier && (
        <div className="panel-card" style={{ borderLeft: '4px solid #7C3AED' }}>
          <div className="settings-section-title">Yeni Tedarikçi</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            <input className="form-select" placeholder="Tedarikçi Adı *"
              value={supName} onChange={e => setSupName(e.target.value)} />
            <input className="form-select" placeholder="Email"
              value={supEmail} onChange={e => setSupEmail(e.target.value)} />
            <input className="form-select" placeholder="Telefon"
              value={supPhone} onChange={e => setSupPhone(e.target.value)} />
          </div>
          <button className="btn-primary" style={{ marginTop: 12 }} onClick={createSupplier} disabled={!supName}>
            💾 Kaydet
          </button>
        </div>
      )}

      {showCreate && (
        <div className="panel-card" style={{ borderLeft: '4px solid #2563EB' }}>
          <div className="settings-section-title">Yeni Satın Alma Siparişi</div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
            <div>
              <label className="form-label">Tedarikçi *</label>
              <select className="form-select" style={{ width: '100%' }}
                value={supplierId} onChange={e => setSupplierId(e.target.value)}>
                <option value="">Seçin...</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Beklenen Teslim Tarihi</label>
              <input type="date" className="form-select" style={{ width: '100%' }}
                value={expectedAt} onChange={e => setExpectedAt(e.target.value)} />
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <strong style={{ fontSize: 13 }}>Kalemler</strong>
              <button className="btn-secondary" style={{ fontSize: 12, padding: '4px 12px' }}
                onClick={() => setItems([...items, { title: '', quantity: 1, unitCost: 0 }])}>➕ Kalem Ekle</button>
            </div>
            {items.map((it, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 100px 110px 130px 40px', gap: 8, marginBottom: 6 }}>
                <input className="form-select" placeholder="Ürün adı"
                  value={it.title} onChange={e => {
                    const next = [...items]; next[idx].title = e.target.value; setItems(next)
                  }} />
                <input className="form-select" placeholder="SKU"
                  value={it.sku || ''} onChange={e => {
                    const next = [...items]; next[idx].sku = e.target.value; setItems(next)
                  }} />
                <input type="number" min={1} className="form-select" placeholder="Adet"
                  value={it.quantity} onChange={e => {
                    const next = [...items]; next[idx].quantity = parseInt(e.target.value) || 0; setItems(next)
                  }} />
                <input type="number" min={0} step={0.01} className="form-select" placeholder="Birim ₺"
                  value={it.unitCost} onChange={e => {
                    const next = [...items]; next[idx].unitCost = parseFloat(e.target.value) || 0; setItems(next)
                  }} />
                <div style={{ padding: '8px', fontWeight: 700, textAlign: 'right' }}>
                  {formatCurrency(it.quantity * it.unitCost, 'TRY')}
                </div>
                <button className="btn-secondary" style={{ color: '#DC2626' }}
                  onClick={() => setItems(items.filter((_, i) => i !== idx))}>🗑</button>
              </div>
            ))}
            <div style={{
              marginTop: 12, padding: 12, background: '#EFF6FF',
              borderRadius: 8, display: 'flex', justifyContent: 'space-between',
            }}>
              <strong>TOPLAM:</strong>
              <strong style={{ fontSize: 18, color: '#2563EB' }}>{formatCurrency(total, 'TRY')}</strong>
            </div>
          </div>

          <textarea className="form-select" style={{ width: '100%', marginTop: 12, minHeight: 50 }}
            placeholder="Notlar..." value={notes} onChange={e => setNotes(e.target.value)} />

          <button className="btn-primary" style={{ marginTop: 14 }} onClick={createOrder}>
            💾 Siparişi Oluştur
          </button>
        </div>
      )}

      <div className="panel-card" style={{ padding: 0 }}>
        {loading ? <div style={{ padding: 40, textAlign: 'center' }}>⏳ Yükleniyor...</div>
          : orders.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
              <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>Henüz satın alma siparişi yok</div>
              <div style={{ fontSize: 13, marginTop: 6 }}>Önce tedarikçi ekle, sonra sipariş oluştur</div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>PO No</th><th>Tedarikçi</th><th>Kalem</th><th>Tutar</th><th>Beklenen</th><th>Durum</th><th>İşlem</th></tr>
              </thead>
              <tbody>
                {orders.map(o => {
                  const st = STATUS_LABEL[o.status] ?? { label: o.status, cls: 'pending' }
                  return (
                    <tr key={o.id}>
                      <td><code style={{ background: 'var(--hover-bg)', padding: '2px 8px', borderRadius: 4 }}>{o.poNumber}</code></td>
                      <td><strong>{o.supplier.name}</strong></td>
                      <td>{o.items.length}</td>
                      <td><strong>{formatCurrency(o.totalAmount, o.currency)}</strong></td>
                      <td><small>{o.expectedAt ? new Date(o.expectedAt).toLocaleDateString('tr-TR') : '—'}</small></td>
                      <td><span className={`status-badge ${st.cls}`}>{st.label}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {o.status === 'DRAFT' && (
                            <button className="btn-secondary" style={{ fontSize: 11, padding: '4px 8px' }}
                              onClick={() => setStatus(o.id, 'ORDERED')}>📤 Sipariş Et</button>
                          )}
                          {o.status === 'ORDERED' && (
                            <button className="btn-secondary" style={{ fontSize: 11, padding: '4px 8px', color: '#059669' }}
                              onClick={() => setStatus(o.id, 'RECEIVED')}>✅ Teslim Aldım</button>
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
