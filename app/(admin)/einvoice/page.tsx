'use client'

import { useEffect, useState } from 'react'
import { formatCurrency, formatDate } from '@/lib/shopify-data'

interface EInvoice {
  id: number
  orderId: string
  orderName: string
  invoiceType: 'EFATURA' | 'EARSIV'
  taxId: string | null
  taxOffice: string | null
  customerName: string
  customerAddress: string
  totalAmount: string
  taxAmount: string
  currency: string
  invoiceNumber: string | null
  status: string
  pdfUrl: string | null
  xmlContent: string | null
  createdAt: string
  sentAt: string | null
}

export default function EInvoicePage() {
  const [invoices, setInvoices] = useState<EInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [selected, setSelected] = useState<EInvoice | null>(null)

  // Form
  const [orderName, setOrderName] = useState('#1001')
  const [customerName, setCustomerName] = useState('')
  const [taxId, setTaxId] = useState('')
  const [taxOffice, setTaxOffice] = useState('')
  const [address, setAddress] = useState('')
  const [totalAmount, setTotalAmount] = useState('1180')
  const [taxAmount, setTaxAmount] = useState('180')
  const [creating, setCreating] = useState(false)

  const [dash, setDash] = useState<{ stats: any; errors: any[] } | null>(null)

  async function load() {
    setLoading(true)
    try {
      const [res, dres] = await Promise.all([
        fetch('/api/einvoice').then(r => r.json()),
        fetch('/api/einvoice/dashboard').then(r => r.json()).catch(() => null),
      ])
      if (res.success) setInvoices(res.invoices || [])
      if (dres?.success) setDash({ stats: dres.stats, errors: dres.errors })
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const detectedType = taxId.replace(/\D/g, '').length === 10 ? 'EFATURA'
    : taxId.replace(/\D/g, '').length === 11 ? 'EARSIV' : null

  async function create() {
    if (!customerName || !address || !totalAmount) {
      alert('Müşteri, adres ve tutar gerekli'); return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/einvoice/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: `gid://shopify/Order/${Date.now()}`,
          orderName,
          customerName, taxId: taxId || null, taxOffice: taxOffice || null,
          address, totalAmount, taxAmount,
        }),
      })
      const data = await res.json()
      if (data.success) {
        alert(`✅ ${data.message}`)
        setShowCreate(false)
        setCustomerName(''); setTaxId(''); setTaxOffice(''); setAddress('')
        await load()
      } else alert('❌ ' + data.message)
    } finally { setCreating(false) }
  }

  function downloadXml(inv: EInvoice) {
    if (!inv.xmlContent) return
    const blob = new Blob([inv.xmlContent], { type: 'application/xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${inv.invoiceNumber || 'fatura'}.xml`
    a.click()
    URL.revokeObjectURL(url)
  }

  function viewPdf(inv: EInvoice) {
    // Yazdırılabilir HTML — yeni sekmede aç → Ctrl+P ile PDF kaydet
    window.open(`/api/einvoice/${inv.id}/pdf`, '_blank')
  }

  function printPdf(inv: EInvoice) {
    // Yazdırma diyalogu otomatik açılır
    window.open(`/api/einvoice/${inv.id}/pdf?autoprint=1`, '_blank')
  }

  const [statusFilter, setStatusFilter] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)

  async function issueInv(inv: EInvoice) {
    if (!confirm(`${inv.invoiceNumber || inv.orderName} faturası kesilecek (servis sağlayıcıya gönderilecek). Devam?`)) return
    setBusyId(inv.id)
    try {
      const res = await fetch(`/api/einvoice/${inv.id}/issue`, { method: 'POST' })
      const d = await res.json()
      alert((d.success ? '✅ ' : '❌ ') + d.message)
      await load()
    } finally { setBusyId(null) }
  }

  async function cancelInv(inv: EInvoice) {
    const reason = prompt('İptal sebebi (opsiyonel):') ?? undefined
    if (reason === undefined && !confirm('Fatura iptal edilsin mi?')) return
    setBusyId(inv.id)
    try {
      const res = await fetch(`/api/einvoice/${inv.id}/cancel`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }),
      })
      const d = await res.json()
      alert((d.success ? '✅ ' : '❌ ') + d.message)
      await load()
    } finally { setBusyId(null) }
  }

  async function emailInv(inv: EInvoice) {
    const email = prompt('Faturanın gönderileceği e-posta adresi:')
    if (!email) return
    setBusyId(inv.id)
    try {
      const res = await fetch(`/api/einvoice/${inv.id}/send-email`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }),
      })
      const d = await res.json()
      alert((d.success ? '✅ ' : '❌ ') + d.message)
    } finally { setBusyId(null) }
  }

  const stats = {
    efatura: invoices.filter(i => i.invoiceType === 'EFATURA').length,
    earsiv: invoices.filter(i => i.invoiceType === 'EARSIV').length,
    draft: invoices.filter(i => i.status === 'DRAFT').length,
    sent: invoices.filter(i => i.status === 'SENT').length,
  }

  return (
    <div className="page-content">
      <div className="product-header">
        <h1 className="page-title">e-Fatura &amp; e-Arşiv</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href="/einvoice/settings" className="btn-secondary" style={{ textDecoration: 'none' }}>⚙️ Servisler</a>
          <button className="btn-primary" onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? '✕ İptal' : '📄 Yeni Fatura'}
          </button>
        </div>
      </div>

      <div className="panel-card" style={{
        background: '#FFFBEB', border: '1px solid #FDE68A', borderLeft: '4px solid #F59E0B',
      }}>
        <div style={{ fontSize: 13, color: '#92400E' }}>
          <strong>ℹ️ Sağlayıcı modu:</strong> "Fatura Kes" seçili e-Fatura servisine gönderir.
          <strong> Sandbox</strong> modda GİB'e gerçekten gitmez (uçtan uca test). <strong>Canlı</strong> mod için
          GİB doğrudan entegrasyon + mali mühür gerekir (<a href="/einvoice/settings" style={{ color: '#92400E', textDecoration: 'underline' }}>Servisler</a>).
          UBL-TR XML üretimi hazırdır.
        </div>
      </div>

      <div className="dashboard-grid-2" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="panel-card" style={{ borderTop: '3px solid #059669' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>🧾 Bugün Kesilen</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#059669', marginTop: 4 }}>{dash?.stats.today ?? '—'}</div>
        </div>
        <div className="panel-card" style={{ borderTop: '3px solid #2563EB' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>📅 Bu Ay Kesilen</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#2563EB', marginTop: 4 }}>{dash?.stats.month ?? '—'}</div>
        </div>
        <div className="panel-card" style={{ borderTop: '3px solid #D97706' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>📝 Bekleyen (Taslak)</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#D97706', marginTop: 4 }}>{dash?.stats.pending ?? '—'}</div>
        </div>
        <div className="panel-card" style={{ borderTop: '3px solid #DC2626' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>❌ Hatalı</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#DC2626', marginTop: 4 }}>{dash?.stats.error ?? '—'}</div>
        </div>
      </div>

      {dash && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '0 2px' }}>
          Toplam <strong>{dash.stats.total}</strong> · 📄 e-Fatura {dash.stats.efatura} · 📑 e-Arşiv {dash.stats.earsiv} · 🚫 İptal {dash.stats.cancelled}
        </div>
      )}

      {/* Hata Log Paneli */}
      {dash && dash.errors.length > 0 && (
        <div className="panel-card" style={{ borderLeft: '4px solid #DC2626' }}>
          <div className="settings-section-title" style={{ color: '#B91C1C' }}>⚠️ Hata Logları (son {dash.errors.length})</div>
          <div className="data-table-container">
            <table className="data-table">
              <thead><tr><th>Zaman</th><th>İşlem</th><th>Sipariş/Fatura</th><th>Mesaj</th></tr></thead>
              <tbody>
                {dash.errors.map((l: any) => (
                  <tr key={l.id}>
                    <td><small>{formatDate(l.createdAt)}</small></td>
                    <td><span className="status-badge cancelled">{l.action}</span></td>
                    <td><small>{l.invoiceId ? `#${l.invoiceId}` : ''}{l.orderId ? ` · ${String(l.orderId).slice(-8)}` : ''}</small></td>
                    <td style={{ fontSize: 12, color: '#B91C1C', maxWidth: 420, whiteSpace: 'normal' }}>{l.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="panel-card" style={{ borderLeft: '4px solid #7C3AED' }}>
          <div className="settings-section-title">Yeni Fatura Oluştur (Taslak)</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            <div>
              <label className="form-label">Sipariş No</label>
              <input className="form-select" style={{ width: '100%' }} value={orderName} onChange={e => setOrderName(e.target.value)} />
            </div>
            <div>
              <label className="form-label">Müşteri Adı / Firma Ünvanı</label>
              <input className="form-select" style={{ width: '100%' }} value={customerName} onChange={e => setCustomerName(e.target.value)} />
            </div>
            <div>
              <label className="form-label">
                VKN (10 hane → e-Fatura) veya TCKN (11 hane → e-Arşiv)
                {detectedType && (
                  <span style={{
                    marginLeft: 8, fontSize: 10, padding: '2px 8px', borderRadius: 4,
                    background: detectedType === 'EFATURA' ? '#EDE9FE' : '#DBEAFE',
                    color: detectedType === 'EFATURA' ? '#6D28D9' : '#1E40AF', fontWeight: 700,
                  }}>{detectedType === 'EFATURA' ? '📄 e-Fatura' : '📑 e-Arşiv'}</span>
                )}
              </label>
              <input className="form-select" style={{ width: '100%', fontFamily: 'monospace' }}
                value={taxId} onChange={e => setTaxId(e.target.value.replace(/\D/g, '').slice(0, 11))}
                placeholder="örn: 12345678901" />
            </div>
            <div>
              <label className="form-label">Vergi Dairesi (VKN için)</label>
              <input className="form-select" style={{ width: '100%' }} value={taxOffice} onChange={e => setTaxOffice(e.target.value)}
                disabled={detectedType !== 'EFATURA'} placeholder="örn: Şişli" />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Adres</label>
              <textarea className="form-select" style={{ width: '100%', minHeight: 60, fontFamily: 'inherit' }}
                value={address} onChange={e => setAddress(e.target.value)} />
            </div>
            <div>
              <label className="form-label">Toplam Tutar (KDV dahil)</label>
              <input type="number" step="0.01" className="form-select" style={{ width: '100%' }}
                value={totalAmount} onChange={e => setTotalAmount(e.target.value)} />
            </div>
            <div>
              <label className="form-label">KDV Tutarı</label>
              <input type="number" step="0.01" className="form-select" style={{ width: '100%' }}
                value={taxAmount} onChange={e => setTaxAmount(e.target.value)} />
            </div>
          </div>
          <button className="btn-primary" style={{ marginTop: 14 }} onClick={create} disabled={creating}>
            {creating ? '⏳ Oluşturuluyor...' : '📄 Faturayı Üret (Taslak)'}
          </button>
        </div>
      )}

      <div className="panel-card" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Filtre:</span>
        {[
          { v: '', label: 'Tümü' },
          { v: 'DRAFT', label: '📝 Kesilmedi' },
          { v: 'APPROVED', label: '✅ Kesildi' },
          { v: 'SENT', label: '📤 Gönderildi' },
          { v: 'CANCELLED', label: '🚫 İptal' },
          { v: 'ERROR', label: '❌ Hata' },
        ].map(f => (
          <button key={f.v} className="btn-secondary" onClick={() => setStatusFilter(f.v)}
            style={statusFilter === f.v ? { background: '#EDE9FE', color: '#6D28D9', borderColor: '#C4B5FD', fontWeight: 600, fontSize: 12 } : { fontSize: 12 }}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="panel-card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>⏳ Yükleniyor...</div>
        ) : invoices.filter(i => !statusFilter || i.status === statusFilter).length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📄</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-main)' }}>Henüz fatura yok</div>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Fatura No</th>
                <th>Tip</th>
                <th>Müşteri</th>
                <th>Sipariş</th>
                <th>Tutar</th>
                <th>Durum</th>
                <th>Tarih</th>
                <th style={{ textAlign: 'right' }}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {invoices.filter(i => !statusFilter || i.status === statusFilter).map(i => (
                <tr key={i.id}>
                  <td><code style={{ background: 'var(--hover-bg)', padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>{i.invoiceNumber}</code></td>
                  <td>
                    <span style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 4, fontWeight: 700,
                      background: i.invoiceType === 'EFATURA' ? '#EDE9FE' : '#DBEAFE',
                      color: i.invoiceType === 'EFATURA' ? '#6D28D9' : '#1E40AF',
                    }}>
                      {i.invoiceType === 'EFATURA' ? '📄 e-Fatura' : '📑 e-Arşiv'}
                    </span>
                  </td>
                  <td>
                    <strong>{i.customerName}</strong>
                    {i.taxId && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{i.taxId}</div>}
                  </td>
                  <td><small>{i.orderName}</small></td>
                  <td><strong>{formatCurrency(i.totalAmount, i.currency)}</strong></td>
                  <td>
                    <span className={`status-badge ${['SENT', 'APPROVED'].includes(i.status) ? 'delivered' : ['CANCELLED', 'ERROR', 'REJECTED'].includes(i.status) ? 'cancelled' : 'pending'}`}>
                      {({ DRAFT: 'Kesilmedi', APPROVED: 'Kesildi', SENT: 'Gönderildi', CANCELLED: 'İptal', ERROR: 'Hata', REJECTED: 'Red' } as any)[i.status] || i.status}
                    </span>
                  </td>
                  <td><small>{formatDate(i.createdAt)}</small></td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      {(i.status === 'DRAFT' || i.status === 'ERROR') && (
                        <button className="btn-primary" style={{ padding: '6px 10px', fontSize: 12 }} disabled={busyId === i.id}
                          title="Faturayı kes (servis sağlayıcıya gönder)" onClick={() => issueInv(i)}>
                          {busyId === i.id ? '⏳' : '🧾 Fatura Kes'}
                        </button>
                      )}
                      {(i.status === 'SENT' || i.status === 'APPROVED') && (
                        <>
                          <button className="btn-secondary" style={{ padding: '6px 10px', fontSize: 12 }} disabled={busyId === i.id}
                            title="Müşteriye e-posta gönder" onClick={() => emailInv(i)}>✉️</button>
                          <button className="btn-secondary" style={{ padding: '6px 10px', fontSize: 12, color: '#DC2626', borderColor: '#FCA5A5' }} disabled={busyId === i.id}
                            title="Faturayı iptal et" onClick={() => cancelInv(i)}>🚫 İptal</button>
                        </>
                      )}
                      <button className="btn-secondary" style={{ padding: '6px 10px', fontSize: 12 }}
                        title="PDF görüntüle" onClick={() => viewPdf(i)}>📄</button>
                      <button className="btn-secondary" style={{ padding: '6px 10px', fontSize: 12, opacity: 0.7 }}
                        title="UBL-TR XML önizleme" onClick={() => setSelected(i)}>{'<'}/{'>'}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* XML önizleme modal */}
      {selected && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }} onClick={() => setSelected(null)}>
          <div style={{
            background: 'var(--bg-panel)', borderRadius: 12, padding: 20,
            maxWidth: 800, maxHeight: '80vh', overflow: 'auto', width: '100%',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <strong>UBL-TR XML — {selected.invoiceNumber}</strong>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  Foriba/EDM/Logo gibi entegratörlere yüklemek için bu XML kullanılır.
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn-secondary" style={{ padding: '6px 10px', fontSize: 12 }}
                  onClick={() => downloadXml(selected)}>📥 XML İndir</button>
                <button className="btn-secondary" onClick={() => setSelected(null)}>✕</button>
              </div>
            </div>
            <pre style={{
              background: '#0F172A', color: '#A7F3D0', padding: 16, borderRadius: 8,
              fontSize: 11, overflow: 'auto', maxHeight: '60vh',
            }}>{selected.xmlContent}</pre>
          </div>
        </div>
      )}
    </div>
  )
}
