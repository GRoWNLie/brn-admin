'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { OrderDetail } from '@/lib/shopify-orders'
import { formatCurrency, formatDate } from '@/lib/shopify-data'
import Barcode from '@/components/Barcode'
import { barcodeSvg } from '@/lib/barcode'

export default function OrderDetailClient({ order }: { order: OrderDetail }) {
  const router = useRouter()
  const [fulfilling, setFulfilling] = useState(false)
  const [refunding, setRefunding] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const [binMap, setBinMap] = useState<Record<string, string>>({})

  // Sipariş kalemlerinin raf lokasyonlarını çek (SKU bazlı)
  useEffect(() => {
    const skus = Array.from(new Set(order.lineItems.map(li => li.sku).filter(Boolean))) as string[]
    if (skus.length === 0) return
    fetch(`/api/bin-locations?skus=${encodeURIComponent(skus.join(','))}`)
      .then(r => r.json())
      .then(d => { if (d.success) setBinMap(d.map || {}) })
      .catch(() => {})
  }, [order.lineItems])

  // ── e-Fatura ──
  const [invoice, setInvoice] = useState<any>(null)
  const [invLoading, setInvLoading] = useState(true)
  const [invBusy, setInvBusy] = useState(false)

  async function loadInvoice() {
    setInvLoading(true)
    try {
      const res = await fetch(`/api/einvoice/by-order?orderId=${encodeURIComponent(order.id)}`)
      const d = await res.json()
      if (d.success) setInvoice(d.invoice)
    } finally { setInvLoading(false) }
  }
  useEffect(() => { loadInvoice() }, [order.id])

  async function issueFromOrder() {
    if (!confirm(`${order.name} için e-Fatura kesilecek. (TCKN/VKN sipariş notundan okunur; yoksa e-Arşiv kesilir.) Devam?`)) return
    setInvBusy(true)
    try {
      const res = await fetch('/api/einvoice/from-order', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, issue: true }),
      })
      const d = await res.json()
      setMsg({ kind: d.success ? 'success' : 'error', text: d.message })
      await loadInvoice()
    } finally { setInvBusy(false) }
  }

  async function retryIssue() {
    if (!invoice) return
    setInvBusy(true)
    try {
      const res = await fetch(`/api/einvoice/${invoice.id}/issue`, { method: 'POST' })
      const d = await res.json()
      setMsg({ kind: d.success ? 'success' : 'error', text: d.message })
      await loadInvoice()
    } finally { setInvBusy(false) }
  }

  // ── Hazırlık & Kargo iş akışı ──
  const [workflow, setWorkflow] = useState<any>(null)
  const [wfBusy, setWfBusy] = useState(false)

  async function loadWorkflow() {
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(order.id)}/cargo-label`)
      const d = await res.json()
      if (d.success) setWorkflow(d.workflow)
    } catch {}
  }
  useEffect(() => { loadWorkflow() }, [order.id])

  async function createCargoLabel() {
    const carrier = prompt('Taşıyıcı (MNG / ARAS / YURTICI) — boş bırakırsan sadece barkod no üretilir:') || ''
    setWfBusy(true)
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(order.id)}/cargo-label`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ carrier: carrier.trim() || undefined, orderName: order.name }),
      })
      const d = await res.json()
      setMsg({ kind: d.success ? 'success' : 'error', text: d.message })
      await loadWorkflow()
    } finally { setWfBusy(false) }
  }

  function printCargoBarcode() {
    if (!workflow?.trackingNumber) return
    const svg = barcodeSvg(workflow.trackingNumber, { height: 80, moduleWidth: 2, fontSize: 14, displayValue: true })
    const w = window.open('', '_blank', 'width=600,height=400')
    if (!w) return
    w.document.write(`<!doctype html><html><head><title>Kargo Barkodu</title></head><body style="text-align:center;font-family:sans-serif;padding:20px">
      <div>${order.name} · ${workflow.carrier || 'Kargo'}</div>${svg}
      <script>window.onload=function(){setTimeout(function(){window.print()},150)}<\/script></body></html>`)
    w.document.close()
  }

  async function cancelInvoice() {
    if (!invoice) return
    const reason = prompt('İptal sebebi (opsiyonel):') ?? undefined
    setInvBusy(true)
    try {
      const res = await fetch(`/api/einvoice/${invoice.id}/cancel`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }),
      })
      const d = await res.json()
      setMsg({ kind: d.success ? 'success' : 'error', text: d.message })
      await loadInvoice()
    } finally { setInvBusy(false) }
  }

  // Fulfill form state
  const [trackingCompany, setTrackingCompany] = useState('Aras Kargo')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [trackingUrl, setTrackingUrl] = useState('')
  const [notifyCustomer, setNotifyCustomer] = useState(true)

  // ───── İade modalı ─────
  const [refundModalOpen, setRefundModalOpen] = useState(false)
  const [refundQuantities, setRefundQuantities] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {}
    order.lineItems.forEach(li => { init[li.id] = 0 })
    return init
  })
  const [refundNote, setRefundNote] = useState('')

  const refundLines = useMemo(() =>
    order.lineItems.map(li => ({
      ...li,
      refundQty: refundQuantities[li.id] ?? 0,
      lineTotal: parseFloat(li.unitPrice) * (refundQuantities[li.id] ?? 0),
    })),
  [order.lineItems, refundQuantities])

  const refundTotal = refundLines.reduce((s, l) => s + l.lineTotal, 0)


  // ───── Fatura modalı ─────
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false)
  const [existingInvoice, setExistingInvoice] = useState<any>(null)
  const [checkingInvoice, setCheckingInvoice] = useState(true)
  const [selectedLineIds, setSelectedLineIds] = useState<Set<string>>(() => {
    const s = new Set<string>()
    order.lineItems.forEach(li => s.add(li.id))
    return s
  })
  const [invCustomerName, setInvCustomerName] = useState(
    order.customer?.displayName || order.shippingAddress?.name || ''
  )
  const [invTaxId, setInvTaxId] = useState('')
  const [invTaxOffice, setInvTaxOffice] = useState('')
  const [invAddress, setInvAddress] = useState(() => {
    const a = order.shippingAddress
    return [a?.address1, a?.address2, a?.zip, a?.city, a?.province, a?.country].filter(Boolean).join(', ')
  })
  const [generatingInvoice, setGeneratingInvoice] = useState(false)

  // Bu sipariş için fatura var mı?
  useEffect(() => {
    let cancel = false
    fetch(`/api/einvoice/by-order?orderId=${encodeURIComponent(order.id)}`)
      .then(r => r.json())
      .then(d => { if (!cancel) setExistingInvoice(d.invoice) })
      .finally(() => { if (!cancel) setCheckingInvoice(false) })
    return () => { cancel = true }
  }, [order.id])

  const openFulfillmentOrder = order.fulfillmentOrders.find(fo => fo.status === 'OPEN' || fo.status === 'IN_PROGRESS')

  async function handleFulfill() {
    if (!openFulfillmentOrder) return
    setFulfilling(true); setMsg(null)
    try {
      const res = await fetch(`/api/shopify/orders/${encodeURIComponent(order.id)}/fulfill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fulfillmentOrderId: openFulfillmentOrder.id,
          trackingCompany,
          trackingNumber: trackingNumber || undefined,
          trackingUrl: trackingUrl || undefined,
          notifyCustomer,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setMsg({ kind: 'success', text: '🚚 Kargo başarıyla başlatıldı! Sayfayı yeniliyorum...' })
        setTimeout(() => router.refresh(), 1500)
      } else {
        setMsg({ kind: 'error', text: `❌ ${data.message}` })
      }
    } catch (e: any) {
      setMsg({ kind: 'error', text: `❌ ${e?.message}` })
    } finally { setFulfilling(false) }
  }

  async function handleRefund() {
    const items = refundLines.filter(l => l.refundQty > 0)
    if (items.length === 0) {
      setMsg({ kind: 'error', text: 'En az 1 ürün için iade adedi girin (0 dan farklı)' })
      return
    }
    if (!confirm(`${items.length} ürün için toplam ${formatCurrency(refundTotal, order.currency)} iade edilecek. Onay?`)) return
    setRefunding(true); setMsg(null)
    try {
      const res = await fetch(`/api/shopify/orders/${encodeURIComponent(order.id)}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: refundTotal.toFixed(2),
          currency: order.currency,
          note: refundNote,
          notify: true,
          refundLineItems: items.map(l => ({ lineItemId: l.id, quantity: l.refundQty })),
        }),
      })
      const data = await res.json()
      if (data.success) {
        setMsg({ kind: 'success', text: '💸 İade başarıyla yapıldı!' })
        setRefundModalOpen(false)
        setTimeout(() => router.refresh(), 1500)
      } else {
        setMsg({ kind: 'error', text: `❌ ${data.message}` })
      }
    } catch (e: any) {
      setMsg({ kind: 'error', text: `❌ ${e?.message}` })
    } finally { setRefunding(false) }
  }


  async function handleGenerateInvoice() {
    if (selectedLineIds.size === 0) {
      setMsg({ kind: 'error', text: 'En az 1 ürün seçilmeli' })
      return
    }
    setGeneratingInvoice(true); setMsg(null)
    try {
      const selectedItems = order.lineItems.filter(li => selectedLineIds.has(li.id))
      const selectedTotal = selectedItems.reduce(
        (s, li) => s + parseFloat(li.unitPrice) * li.quantity, 0
      )
      const taxRate = parseFloat(order.totalTax) / Math.max(parseFloat(order.totalPrice) - parseFloat(order.totalTax), 1)
      const selectedTax = (selectedTotal * taxRate) / (1 + taxRate)

      const res = await fetch('/api/einvoice/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          orderName: order.name,
          customerName: invCustomerName || '—',
          taxId: invTaxId.trim() || null,
          taxOffice: invTaxOffice.trim() || null,
          address: invAddress || '—',
          totalAmount: selectedTotal.toFixed(2),
          taxAmount: selectedTax.toFixed(2),
        }),
      })
      const data = await res.json()
      if (data.success) {
        setMsg({ kind: 'success', text: `✅ ${data.message}` })
        setInvoiceModalOpen(false)
        setExistingInvoice(data.invoice)
      } else if (data.code === 'ALREADY_EXISTS') {
        setExistingInvoice(data.existingInvoice)
        setMsg({ kind: 'error', text: `⚠️ ${data.message}` })
        setInvoiceModalOpen(false)
      } else {
        setMsg({ kind: 'error', text: `❌ ${data.message}` })
      }
    } catch (e: any) {
      setMsg({ kind: 'error', text: `❌ ${e?.message}` })
    } finally { setGeneratingInvoice(false) }
  }

  const finBadgeClass = order.displayFinancialStatus === 'PAID' ? 'paid'
    : order.displayFinancialStatus === 'REFUNDED' ? 'cancelled'
    : 'pending'
  const fulBadgeClass = order.displayFulfillmentStatus === 'FULFILLED' ? 'delivered' : 'pending'

  return (
    <div className="page-content">
      <div className="product-header">
        <div>
          <button
            onClick={() => router.push('/orders')}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12, marginBottom: 4 }}
          >← Siparişler</button>
          <h1 className="page-title">
            {order.name}
            <span className={`status-badge ${finBadgeClass}`} style={{ marginLeft: 12, fontSize: 12 }}>
              {order.displayFinancialStatus || '—'}
            </span>
            <span className={`status-badge ${fulBadgeClass}`} style={{ marginLeft: 6, fontSize: 12 }}>
              {order.displayFulfillmentStatus || '—'}
            </span>
          </h1>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            {formatDate(order.createdAt)}
          </div>
        </div>
        <div className="product-actions-right" style={{ display: 'flex', gap: 8 }}>
          {checkingInvoice ? (
            <button className="btn-secondary" disabled>⏳ Fatura kontrol ediliyor...</button>
          ) : existingInvoice ? (
            <button className="btn-secondary"
              style={{ color: '#059669', borderColor: '#A7F3D0' }}
              title={`Bu siparişin faturası: ${existingInvoice.invoiceNumber}`}
              onClick={() => window.open(`/api/einvoice/${existingInvoice.id}/pdf`, '_blank')}>
              📄 Faturayı Gör ({existingInvoice.invoiceNumber})
            </button>
          ) : (
            <button className="btn-secondary"
              title="UBL-TR XML formatında e-Fatura/e-Arşiv taslağı oluştur"
              onClick={() => setInvoiceModalOpen(true)}>
              📄 Fatura Oluştur
            </button>
          )}
          <button className="btn-secondary"
            onClick={() => setRefundModalOpen(true)}
            style={{ color: '#DC2626', borderColor: '#FCA5A5' }}>
            💸 İade
          </button>
          <button className="btn-secondary"
            title="Yazdırılabilir kargo etiketi (barkod dahil)"
            onClick={() => {
              window.open(`/api/shopify/orders/${encodeURIComponent(order.id)}/shipping-label`, '_blank')
            }}>
            🏷️ Kargo Etiketi
          </button>
        </div>
      </div>

      {msg && (
        <div className="panel-card" style={{ borderLeft: `4px solid ${msg.kind === 'success' ? '#10B981' : '#DC2626'}`, whiteSpace: 'pre-wrap' }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{msg.text}</div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        {/* SOL */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Ürünler */}
          <div className="panel-card">
            <div className="settings-section-title">Sipariş Kalemleri</div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ürün</th>
                  <th>Lokasyon</th>
                  <th>Adet</th>
                  <th>Birim</th>
                  <th>Tutar</th>
                </tr>
              </thead>
              <tbody>
                {order.lineItems.map(li => (
                  <tr key={li.id}>
                    <td>
                      <div className="product-cell">
                        <div className="product-img" style={li.image
                          ? { backgroundImage: `url(${li.image})`, backgroundSize: 'cover' } : undefined} />
                        <div className="product-info">
                          <span className="product-name">{li.title}</span>
                          {li.sku && <span className="product-sku">{li.sku}</span>}
                        </div>
                      </div>
                    </td>
                    <td>
                      {li.sku && binMap[li.sku]
                        ? <span className="badge badge-delivered" style={{ fontFamily: 'monospace' }}>📍 {binMap[li.sku]}</span>
                        : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td>{li.quantity}</td>
                    <td>{formatCurrency(li.unitPrice, order.currency)}</td>
                    <td><strong>{formatCurrency(parseFloat(li.unitPrice) * li.quantity, order.currency)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
              <Row label="Ara Toplam" value={formatCurrency(parseFloat(order.totalPrice) - parseFloat(order.totalShipping) - parseFloat(order.totalTax), order.currency)} />
              <Row label="Kargo" value={formatCurrency(order.totalShipping, order.currency)} />
              <Row label="Vergi" value={formatCurrency(order.totalTax, order.currency)} />
              <Row label="İndirim" value={`-${formatCurrency(order.totalDiscounts, order.currency)}`} />
              <Row label="İade Edilen" value={`-${formatCurrency(order.totalRefunded, order.currency)}`} />
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--border-color)', fontWeight: 700, fontSize: 15 }}>
                <span>TOPLAM</span><span>{formatCurrency(order.totalPrice, order.currency)}</span>
              </div>
            </div>
          </div>

          {/* e-Fatura */}
          <div className="panel-card">
            <div className="settings-section-title">🧾 e-Fatura</div>
            {invLoading ? (
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>⏳ Kontrol ediliyor...</div>
            ) : !invoice ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Bu sipariş için fatura kesilmemiş.</span>
                <button className="btn-primary" disabled={invBusy} onClick={issueFromOrder}>
                  {invBusy ? '⏳ Kesiliyor...' : '🧾 Fatura Kes'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13 }}>
                  <strong>{invoice.invoiceNumber || '—'}</strong> · {invoice.invoiceType === 'EFATURA' ? 'e-Fatura' : 'e-Arşiv'}
                </span>
                <span className={`status-badge ${['SENT', 'APPROVED'].includes(invoice.status) ? 'delivered' : ['CANCELLED', 'ERROR'].includes(invoice.status) ? 'cancelled' : 'pending'}`}>
                  {({ DRAFT: 'Kesilmedi', APPROVED: 'Kesildi', SENT: 'Gönderildi', CANCELLED: 'İptal', ERROR: 'Hata' } as any)[invoice.status] || invoice.status}
                </span>
                <a className="btn-secondary" style={{ fontSize: 12, textDecoration: 'none' }} href={`/api/einvoice/${invoice.id}/pdf`} target="_blank" rel="noreferrer">📄 PDF</a>
                {(invoice.status === 'SENT' || invoice.status === 'APPROVED') && (
                  <button className="btn-secondary" style={{ fontSize: 12, color: '#DC2626' }} disabled={invBusy} onClick={cancelInvoice}>🚫 İptal</button>
                )}
                {invoice.status === 'ERROR' && (
                  <button className="btn-primary" style={{ fontSize: 12 }} disabled={invBusy} onClick={retryIssue}>🔁 Tekrar Dene</button>
                )}
                {invoice.status === 'DRAFT' && (
                  <button className="btn-primary" style={{ fontSize: 12 }} disabled={invBusy} onClick={retryIssue}>🧾 Fatura Kes</button>
                )}
              </div>
            )}
          </div>

          {/* Hazırlık & Kargo iş akışı */}
          <div className="panel-card">
            <div className="settings-section-title">📦 Hazırlık & Kargo Durumu</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span className={`status-badge ${workflow?.status === 'SHIPPED' ? 'delivered' : 'pending'}`}>
                {workflow?.status === 'SHIPPED' ? '🚚 Kargoya Verildi'
                  : workflow?.status === 'PREPARED' ? '📦 Hazırlandı (faturalandı)'
                  : '🆕 Yeni'}
              </span>
              {workflow?.invoicedAt && <small style={{ color: 'var(--text-muted)' }}>Fatura: {formatDate(workflow.invoicedAt)}</small>}
              {workflow?.shippedAt && <small style={{ color: 'var(--text-muted)' }}>Kargo: {formatDate(workflow.shippedAt)}</small>}

              {workflow?.status !== 'SHIPPED' ? (
                <button className="btn-primary" style={{ fontSize: 13 }} disabled={wfBusy} onClick={createCargoLabel}>
                  {wfBusy ? '⏳...' : '📦 Kargo Barkodu Oluştur'}
                </button>
              ) : (
                <button className="btn-secondary" style={{ fontSize: 13 }} disabled={wfBusy} onClick={createCargoLabel}>
                  🔁 Yeni Barkod
                </button>
              )}
            </div>

            {workflow?.status === 'SHIPPED' && workflow?.trackingNumber && (
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: 14, background: 'var(--hover-bg)', borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {workflow.carrier ? `${workflow.carrier} · ` : ''}Takip No: <strong>{workflow.trackingNumber}</strong>
                </div>
                <Barcode value={workflow.trackingNumber} height={60} moduleWidth={1.6} fontSize={12} />
                <button className="btn-secondary" style={{ fontSize: 12 }} onClick={printCargoBarcode}>🖨️ Barkodu Yazdır</button>
              </div>
            )}
            <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)' }}>
              💡 Fatura kesilince otomatik "Hazırlandı" olur. Kargo barkodu oluşturunca "Kargoya Verildi" işaretlenir.
            </div>
          </div>

          {/* Fulfillment / Kargo */}
          {openFulfillmentOrder && (
            <div className="panel-card" style={{ borderLeft: '4px solid #2563EB' }}>
              <div className="settings-section-title">🚚 Kargo Başlat (Fulfillment)</div>
              <small style={{ color: 'var(--text-muted)' }}>
                Lokasyon: {openFulfillmentOrder.assignedLocation?.name ?? '—'}
              </small>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 12 }}>
                <div>
                  <label className="form-label">Kargo Firması</label>
                  <select className="form-select" style={{ width: '100%' }}
                    value={trackingCompany} onChange={e => setTrackingCompany(e.target.value)}>
                    <optgroup label="🇹🇷 Türk Kargo Firmaları">
                      <option>Aras Kargo</option>
                      <option>Yurtici Kargo</option>
                      <option>MNG Kargo</option>
                      <option>PTT Kargo</option>
                      <option>Surat Kargo</option>
                      <option>HepsiJET</option>
                    </optgroup>
                    <optgroup label="🌍 Uluslararası">
                      <option>UPS</option>
                      <option>DHL</option>
                      <option>FedEx</option>
                    </optgroup>
                  </select>
                </div>
                <div>
                  <label className="form-label">Takip Numarası</label>
                  <input className="form-select" style={{ width: '100%' }}
                    value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)}
                    placeholder="1234567890" />
                </div>
                <div>
                  <label className="form-label">Takip URL (boşsa otomatik)</label>
                  <input className="form-select" style={{ width: '100%' }}
                    value={trackingUrl} onChange={e => setTrackingUrl(e.target.value)}
                    placeholder="Boş bırakılırsa firmanın takip URL'i otomatik üretilir" />
                </div>
              </div>
              {trackingNumber && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                  💡 İpucu: Kaydedildiğinde <a href="/cargo" style={{ color: '#2563EB' }}>Kargo Takip</a> sayfasında otomatik görünecek.
                </div>
              )}
              <label style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
                <input type="checkbox" checked={notifyCustomer} onChange={e => setNotifyCustomer(e.target.checked)} />
                <span style={{ fontSize: 13 }}>Müşteriye bildirim gönder</span>
              </label>
              <button className="btn-primary" style={{ marginTop: 12 }}
                onClick={handleFulfill} disabled={fulfilling}>
                {fulfilling ? '⏳ Kargo başlatılıyor...' : '🚚 Kargo Başlat'}
              </button>
            </div>
          )}

          {/* Mevcut fulfillment'lar */}
          {order.fulfillments.length > 0 && (
            <div className="panel-card">
              <div className="settings-section-title">Gönderilen Kargolar</div>
              {order.fulfillments.map(f => (
                <div key={f.id} style={{ padding: 12, background: 'var(--hover-bg)', borderRadius: 8, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>{f.status}</strong>
                    <small>{formatDate(f.createdAt)}</small>
                  </div>
                  {f.trackingInfo.map((t, i) => (
                    <div key={i} style={{ marginTop: 6, fontSize: 12 }}>
                      <strong>{t.company || '—'}</strong> · {t.number || '—'}
                      {t.url && <> · <a href={t.url} target="_blank" rel="noopener" style={{ color: '#2563EB' }}>Takip et →</a></>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Geçmiş iadeler (özet) */}
          {order.refunds.length > 0 && (
            <div className="panel-card" style={{ borderLeft: '4px solid #DC2626' }}>
              <div className="settings-section-title">💸 Geçmiş İadeler</div>
              {order.refunds.map(r => (
                <div key={r.id} style={{ fontSize: 13, padding: '6px 0', borderBottom: '1px solid var(--border-color)' }}>
                  <strong>{formatCurrency(r.totalRefunded, order.currency)}</strong>
                  <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>· {formatDate(r.createdAt)}</span>
                  {r.note && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{r.note}</div>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SAĞ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Müşteri */}
          <div className="panel-card">
            <div className="settings-section-title">Müşteri</div>
            {order.customer ? (
              <>
                <strong>{order.customer.displayName}</strong>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  {order.customer.email && <div>📧 {order.customer.email}</div>}
                  {order.customer.phone && <div>📞 {order.customer.phone}</div>}
                </div>
              </>
            ) : <small style={{ color: 'var(--text-muted)' }}>Müşteri bilgisi yok (misafir)</small>}
          </div>

          {/* Kargo Adresi */}
          {order.shippingAddress && (
            <div className="panel-card">
              <div className="settings-section-title">Kargo Adresi</div>
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                {order.shippingAddress.name && <div><strong>{order.shippingAddress.name}</strong></div>}
                {order.shippingAddress.address1 && <div>{order.shippingAddress.address1}</div>}
                {order.shippingAddress.address2 && <div>{order.shippingAddress.address2}</div>}
                <div>
                  {[order.shippingAddress.zip, order.shippingAddress.city, order.shippingAddress.province]
                    .filter(Boolean).join(' ')}
                </div>
                {order.shippingAddress.country && <div>{order.shippingAddress.country}</div>}
                {order.shippingAddress.phone && <div style={{ marginTop: 6 }}>📞 {order.shippingAddress.phone}</div>}
              </div>
            </div>
          )}

          {/* Not / Etiketler */}
          {(order.note || order.tags.length > 0) && (
            <div className="panel-card">
              <div className="settings-section-title">Notlar &amp; Etiketler</div>
              {order.note && <div style={{ fontSize: 13, marginBottom: 8 }}>{order.note}</div>}
              {order.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {order.tags.map(t => (
                    <span key={t} style={{ background: 'var(--hover-bg)', padding: '4px 10px', borderRadius: 6, fontSize: 11 }}>{t}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="panel-card" style={{ background: 'var(--hover-bg)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              <strong>Shopify Order ID:</strong>
              <div style={{ fontFamily: 'monospace', fontSize: 10, wordBreak: 'break-all', marginTop: 4 }}>
                {order.id}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ───── İADE MODAL ───── */}
      {refundModalOpen && (
        <div onClick={() => setRefundModalOpen(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--bg-panel)', borderRadius: 14, padding: 24,
            maxWidth: 800, width: '100%', maxHeight: '85vh', overflow: 'auto',
            borderTop: '5px solid #DC2626',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 style={{ fontSize: 18 }}>💸 İade İşlemi — Hangi ürünleri iade edeceksin?</h2>
              <button className="btn-secondary" onClick={() => setRefundModalOpen(false)}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              {refundLines.map(li => (
                <div key={li.id} style={{
                  display: 'grid', gridTemplateColumns: '40px 1fr 110px 110px 110px',
                  gap: 12, alignItems: 'center',
                  padding: 10, background: 'var(--hover-bg)', borderRadius: 8,
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 6,
                    background: li.image ? `url(${li.image}) center/cover` : 'var(--bg-panel)',
                    border: '1px solid var(--border-color)',
                  }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{li.title}</div>
                    {li.sku && <small style={{ color: 'var(--text-muted)' }}>{li.sku}</small>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Sipariş: <strong>{li.quantity} adet</strong>
                  </div>
                  <div>
                    <input type="number" min={0} max={li.quantity}
                      className="form-select" style={{ width: '100%' }}
                      value={li.refundQty}
                      onChange={e => {
                        const v = Math.max(0, Math.min(li.quantity, parseInt(e.target.value || '0', 10)))
                        setRefundQuantities(prev => ({ ...prev, [li.id]: v }))
                      }}
                      placeholder="İade adet" />
                  </div>
                  <div style={{ textAlign: 'right', fontWeight: 700, color: '#DC2626' }}>
                    {formatCurrency(li.lineTotal, order.currency)}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <input className="form-select" style={{ flex: 1 }}
                placeholder="İade notu (opsiyonel) — örn: Müşteri istemedi"
                value={refundNote} onChange={e => setRefundNote(e.target.value)} />
            </div>

            <div style={{
              padding: '14px 18px', background: '#FEF2F2',
              border: '1px solid #FCA5A5', borderRadius: 10,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: 14,
            }}>
              <strong>Toplam İade Tutarı:</strong>
              <strong style={{ fontSize: 20, color: '#DC2626' }}>
                {formatCurrency(refundTotal, order.currency)}
              </strong>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setRefundModalOpen(false)}>İptal</button>
              <button className="btn-primary"
                style={{ background: '#DC2626' }}
                disabled={refunding || refundTotal === 0}
                onClick={handleRefund}>
                {refunding ? '⏳ İade Yapılıyor...' : `💸 ${formatCurrency(refundTotal, order.currency)} İade Yap`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───── FATURA MODAL ───── */}
      {invoiceModalOpen && (
        <div onClick={() => setInvoiceModalOpen(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--bg-panel)', borderRadius: 12, width: '100%', maxWidth: 560,
            maxHeight: '90vh', overflowY: 'auto', padding: 24,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18 }}>📄 e-Fatura / e-Arşiv Oluştur</h2>
              <button className="btn-secondary" onClick={() => setInvoiceModalOpen(false)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label className="form-label">Müşteri / Firma Ünvanı</label>
                <input className="form-select" style={{ width: '100%' }}
                  value={invCustomerName} onChange={e => setInvCustomerName(e.target.value)} />
              </div>
              <div>
                <label className="form-label">
                  VKN / TCKN
                  {invTaxId.replace(/\D/g, '').length === 10 && (
                    <span style={{ marginLeft: 8, fontSize: 10, padding: '2px 8px', borderRadius: 4, background: '#EDE9FE', color: '#6D28D9', fontWeight: 700 }}>📄 e-Fatura</span>
                  )}
                  {invTaxId.replace(/\D/g, '').length === 11 && (
                    <span style={{ marginLeft: 8, fontSize: 10, padding: '2px 8px', borderRadius: 4, background: '#DBEAFE', color: '#1E40AF', fontWeight: 700 }}>📑 e-Arşiv</span>
                  )}
                </label>
                <input className="form-select" style={{ width: '100%' }}
                  value={invTaxId} onChange={e => setInvTaxId(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  placeholder="10 hane → e-Fatura · 11 hane → e-Arşiv" />
              </div>
              {invTaxId.replace(/\D/g, '').length === 10 && (
                <div>
                  <label className="form-label">Vergi Dairesi</label>
                  <input className="form-select" style={{ width: '100%' }}
                    value={invTaxOffice} onChange={e => setInvTaxOffice(e.target.value)} />
                </div>
              )}
              <div>
                <label className="form-label">Adres</label>
                <textarea className="form-select" style={{ width: '100%', minHeight: 60 }}
                  value={invAddress} onChange={e => setInvAddress(e.target.value)} />
              </div>
              <div>
                <label className="form-label">Faturaya Dahil Ürünler</label>
                <div style={{ border: '1px solid var(--border-color)', borderRadius: 8, overflow: 'hidden' }}>
                  {order.lineItems.map(li => (
                    <label key={li.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={selectedLineIds.has(li.id)} onChange={() => {
                        setSelectedLineIds(prev => { const n = new Set(prev); if (n.has(li.id)) n.delete(li.id); else n.add(li.id); return n })
                      }} />
                      <span style={{ flex: 1, fontSize: 13 }}>{li.title} <span style={{ color: 'var(--text-muted)' }}>× {li.quantity}</span></span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{formatCurrency(parseFloat(li.unitPrice) * li.quantity, order.currency)}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                <strong>Fatura Toplamı ({selectedLineIds.size} ürün):</strong>
                <strong style={{ fontSize: 16 }}>
                  {formatCurrency(order.lineItems.filter(li => selectedLineIds.has(li.id)).reduce((s, li) => s + parseFloat(li.unitPrice) * li.quantity, 0), order.currency)}
                </strong>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-secondary" onClick={() => setInvoiceModalOpen(false)}>İptal</button>
                <button className="btn-primary" onClick={handleGenerateInvoice} disabled={generatingInvoice || selectedLineIds.size === 0}>
                  {generatingInvoice ? '⏳ Oluşturuluyor...' : '📄 Faturayı Oluştur'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span>{value}</span>
    </div>
  )
}
