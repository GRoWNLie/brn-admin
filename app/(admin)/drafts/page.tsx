'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/shopify-data'

interface Draft {
  id: string
  name: string
  status: string
  totalPrice: string
  currency: string
  customerName: string
  email: string | null
  invoiceUrl: string | null
  createdAt: string
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  OPEN: { label: 'Açık', cls: 'pending' },
  INVOICE_SENT: { label: 'Fatura Gönderildi', cls: 'pending' },
  COMPLETED: { label: 'Tamamlandı', cls: 'delivered' },
}

export default function DraftsPage() {
  const router = useRouter()
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/shopify/drafts')
      const data = await res.json()
      if (data.success) setDrafts(data.drafts || [])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function completeDraft(id: string, name: string) {
    if (!confirm(`${name} taslağı siparişe dönüştürülecek. Onaylıyor musun?`)) return
    setBusy(id)
    try {
      const res = await fetch(`/api/shopify/drafts/${encodeURIComponent(id)}?action=complete`, { method: 'POST' })
      const data = await res.json()
      if (data.success) { alert('✅ Sipariş oluşturuldu!'); await load() }
      else alert('Hata: ' + data.message)
    } finally { setBusy(null) }
  }

  async function sendInvoice(id: string) {
    setBusy(id)
    try {
      const res = await fetch(`/api/shopify/drafts/${encodeURIComponent(id)}?action=send_invoice`, { method: 'POST' })
      const data = await res.json()
      alert(data.success ? '📧 Fatura emaili gönderildi!' : `Hata: ${data.message}`)
      if (data.success) await load()
    } finally { setBusy(null) }
  }

  async function removeDraft(id: string, name: string) {
    if (!confirm(`${name} taslağı silinecek. Emin misin?`)) return
    setBusy(id)
    try {
      await fetch(`/api/shopify/drafts/${encodeURIComponent(id)}`, { method: 'DELETE' })
      await load()
    } finally { setBusy(null) }
  }

  return (
    <div className="page-content">
      <div className="product-header">
        <h1 className="page-title">Taslak Siparişler</h1>
        <div className="product-actions-right">
          <button className="btn-primary" onClick={() => alert('Yakında — Shopify Admin üzerinden taslak oluştur')}>
            ➕ Taslak Oluştur
          </button>
        </div>
      </div>

      <div className="panel-card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
            ⏳ Taslaklar yükleniyor...
          </div>
        ) : drafts.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📝</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-main)' }}>
              Henüz taslak sipariş yok
            </div>
            <div style={{ fontSize: 13, marginTop: 6 }}>
              Shopify Admin → Orders → Drafts'tan oluşturabilirsin.
            </div>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Taslak</th>
                <th>Müşteri</th>
                <th>Tutar</th>
                <th>Durum</th>
                <th>Tarih</th>
                <th style={{ textAlign: 'right' }}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {drafts.map(d => {
                const st = STATUS_LABEL[d.status] ?? { label: d.status, cls: 'pending' }
                return (
                  <tr key={d.id}>
                    <td><strong>{d.name}</strong></td>
                    <td>
                      <div className="customer-cell">
                        <span className="customer-name">{d.customerName}</span>
                        {d.email && <span className="customer-email">{d.email}</span>}
                      </div>
                    </td>
                    <td><strong>{formatCurrency(d.totalPrice, d.currency)}</strong></td>
                    <td><span className={`status-badge ${st.cls}`}>{st.label}</span></td>
                    <td><small>{formatDate(d.createdAt)}</small></td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        {d.invoiceUrl && (
                          <a className="btn-secondary" style={{ padding: '6px 10px', fontSize: 12, textDecoration: 'none' }}
                            href={d.invoiceUrl} target="_blank" rel="noopener">🔗</a>
                        )}
                        {d.status !== 'COMPLETED' && (
                          <>
                            <button className="btn-secondary" style={{ padding: '6px 10px', fontSize: 12 }}
                              disabled={busy === d.id} onClick={() => sendInvoice(d.id)}>📧 Email</button>
                            <button className="btn-secondary" style={{ padding: '6px 10px', fontSize: 12, color: '#059669', borderColor: '#A7F3D0' }}
                              disabled={busy === d.id} onClick={() => completeDraft(d.id, d.name)}>✅ Siparişe Çevir</button>
                          </>
                        )}
                        <button className="btn-secondary" style={{ padding: '6px 10px', fontSize: 12, color: '#DC2626', borderColor: '#FCA5A5' }}
                          disabled={busy === d.id} onClick={() => removeDraft(d.id, d.name)}>🗑</button>
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
