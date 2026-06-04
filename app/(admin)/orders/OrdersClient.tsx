'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { OrderListResult, formatCurrency, formatDate } from '@/lib/shopify-data'

const FIN_STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  PAID: { label: 'Ödendi', cls: 'paid' },
  PARTIALLY_PAID: { label: 'Kısmen Ödendi', cls: 'pending' },
  PENDING: { label: 'Beklemede', cls: 'pending' },
  REFUNDED: { label: 'İade', cls: 'cancelled' },
  PARTIALLY_REFUNDED: { label: 'Kısmen İade', cls: 'pending' },
  VOIDED: { label: 'İptal', cls: 'cancelled' },
  AUTHORIZED: { label: 'Yetkilendirildi', cls: 'pending' },
}

const FUL_STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  FULFILLED: { label: 'Teslim Edildi', cls: 'delivered' },
  PARTIALLY_FULFILLED: { label: 'Kısmen Gönderildi', cls: 'pending' },
  UNFULFILLED: { label: 'Beklemede', cls: 'pending' },
  IN_PROGRESS: { label: 'Hazırlanıyor', cls: 'pending' },
  ON_HOLD: { label: 'Beklemede', cls: 'pending' },
  RESTOCKED: { label: 'Stok İade', cls: 'cancelled' },
  SCHEDULED: { label: 'Planlandı', cls: 'pending' },
}

interface MpOrderRow {
  id: number; marketplace: string; orderNumber: string; status: string | null
  customerName: string | null; total: number | null; currency: string | null
  lineCount: number | null; orderedAt: string | null
}

const SOURCE_META: Record<string, { name: string; emoji: string; bg: string; color: string }> = {
  SHOPIFY:     { name: 'Shopify', emoji: '🛍', bg: '#E0E7FF', color: '#3730A3' },
  TRENDYOL:    { name: 'Trendyol', emoji: '🟠', bg: '#FFEDD5', color: '#9A3412' },
  HEPSIBURADA: { name: 'Hepsiburada', emoji: '🛒', bg: '#FFE4D6', color: '#9A3412' },
  AMAZON:      { name: 'Amazon', emoji: '📦', bg: '#FEF3C7', color: '#92400E' },
  ETSY:        { name: 'Etsy', emoji: '🎨', bg: '#FFE4E1', color: '#9A3412' },
}

function SourceBadge({ source }: { source: string }) {
  const m = SOURCE_META[source] || { name: source, emoji: '•', bg: '#F3F4F6', color: '#6B7280' }
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: m.bg, color: m.color, whiteSpace: 'nowrap' }}>
      {m.emoji} {m.name}
    </span>
  )
}

export default function OrdersClient({
  data, search, first, financialStatus, fulfillmentStatus, marketplaceOrders = [], workflowMap = {},
}: {
  data: OrderListResult
  search: string
  first: number
  financialStatus: string
  fulfillmentStatus: string
  marketplaceOrders?: MpOrderRow[]
  workflowMap?: Record<string, { status: string; trackingNumber: string | null; carrier: string | null }>
}) {
  const router = useRouter()
  const sp = useSearchParams()
  const [searchInput, setSearchInput] = useState(search)
  const [pending, startTransition] = useTransition()
  const [source, setSource] = useState('ALL')

  // Shopify + pazaryeri siparişlerini birleştir, tarihe göre sırala
  type Row =
    | { kind: 'shopify'; date: number; o: OrderListResult['orders'][number] }
    | { kind: 'mp'; date: number; m: MpOrderRow }
  const rows: Row[] = []
  if (source === 'ALL' || source === 'SHOPIFY') {
    for (const o of data.orders) rows.push({ kind: 'shopify', date: new Date(o.createdAt).getTime(), o })
  }
  for (const m of marketplaceOrders) {
    if (source === 'ALL' || source === m.marketplace) {
      rows.push({ kind: 'mp', date: m.orderedAt ? new Date(m.orderedAt).getTime() : 0, m })
    }
  }
  rows.sort((a, b) => b.date - a.date)
  const mpCount = marketplaceOrders.length

  function navigate(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(sp.toString())
    for (const [k, v] of Object.entries(updates)) {
      if (v === undefined || v === '') params.delete(k); else params.set(k, v)
    }
    // Filtre değiştiğinde sayfayı resetle
    if ('financial' in updates || 'fulfillment' in updates || 'search' in updates) {
      params.delete('after')
    }
    startTransition(() => router.push(`/orders?${params.toString()}`))
  }

  return (
    <div className="panel-card">
      <div className="table-toolbar">
        <div className="toolbar-left">
          <div className="search-box-table">
            <input
              type="text"
              placeholder="Sipariş no, email ara..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') navigate({ search: searchInput }) }}
            />
          </div>
          <button className="btn-secondary" onClick={() => navigate({ search: searchInput })}>
            {pending ? '...' : 'Ara'}
          </button>
          <select
            className="form-select"
            style={{ minWidth: 150 }}
            value={source}
            onChange={e => setSource(e.target.value)}
          >
            <option value="ALL">🌐 Tüm Kaynaklar</option>
            <option value="SHOPIFY">🛍 Shopify</option>
            <option value="TRENDYOL">🟠 Trendyol</option>
            <option value="HEPSIBURADA">🛒 Hepsiburada</option>
            <option value="AMAZON">📦 Amazon</option>
            <option value="ETSY">🎨 Etsy</option>
          </select>
          <select
            className="form-select"
            style={{ minWidth: 160 }}
            value={financialStatus}
            onChange={e => navigate({ financial: e.target.value })}
          >
            <option value="">Tüm Ödeme</option>
            <option value="paid">Ödendi</option>
            <option value="pending">Beklemede</option>
            <option value="refunded">İade</option>
            <option value="voided">İptal</option>
          </select>
          <select
            className="form-select"
            style={{ minWidth: 160 }}
            value={fulfillmentStatus}
            onChange={e => navigate({ fulfillment: e.target.value })}
          >
            <option value="">Tüm Kargo</option>
            <option value="fulfilled">Teslim Edildi</option>
            <option value="unfulfilled">Bekliyor</option>
            <option value="partial">Kısmen</option>
          </select>
        </div>
      </div>

      {rows.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
          {search || financialStatus || fulfillmentStatus || source !== 'ALL'
            ? 'Filtrelerle eşleşen sipariş yok.'
            : 'Henüz sipariş yok.'}
        </div>
      ) : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}><input type="checkbox" className="custom-checkbox" /></th>
                <th>Kaynak</th>
                <th>Sipariş</th>
                <th>Tarih</th>
                <th>Müşteri</th>
                <th style={{ minWidth: 280 }}>Ürünler</th>
                <th>Sipariş Durumu</th>
                <th>Ödeme Durumu</th>
                <th>Toplam</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                if (row.kind === 'mp') {
                  const m = row.m
                  return (
                    <tr key={'mp_' + m.id}>
                      <td onClick={e => e.stopPropagation()}>
                        <input type="checkbox" className="custom-checkbox" />
                      </td>
                      <td><SourceBadge source={m.marketplace} /></td>
                      <td><div className="order-id-cell"><span style={{ fontWeight: 600 }}>{m.orderNumber}</span></div></td>
                      <td>
                        <div className="date-cell">
                          <span className="date-main">
                            {m.orderedAt ? new Date(m.orderedAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                          </span>
                        </div>
                      </td>
                      <td><div className="customer-cell"><span className="customer-name">{m.customerName || '—'}</span></div></td>
                      <td><small style={{ color: 'var(--text-muted)' }}>{m.lineCount ?? 0} kalem</small></td>
                      <td><span className="status-badge pending">{m.status || '—'}</span></td>
                      <td><span className="status-badge pending">Pazaryeri</span></td>
                      <td><div className="order-total-cell"><span className="order-total-amount">{formatCurrency(m.total ?? 0, m.currency || 'TRY')}</span></div></td>
                    </tr>
                  )
                }
                const o = row.o
                const fin = o.financialStatus ? FIN_STATUS_LABEL[o.financialStatus] : null
                const ful = o.fulfillmentStatus ? FUL_STATUS_LABEL[o.fulfillmentStatus] : null
                return (
                  <tr key={o.id} style={{ cursor: 'pointer' }}
                    onClick={() => router.push(`/orders/${encodeURIComponent(o.id)}`)}>
                    <td onClick={e => e.stopPropagation()}>
                      <input type="checkbox" className="custom-checkbox" />
                    </td>
                    <td><SourceBadge source="SHOPIFY" /></td>
                    <td>
                      <div className="order-id-cell">
                        <span style={{ color: '#2563EB', fontWeight: 600 }}>{o.name}</span>
                        {workflowMap[o.id] && workflowMap[o.id].status !== 'NEW' && (
                          <div style={{ marginTop: 3 }}>
                            <span style={{
                              fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 8,
                              background: workflowMap[o.id].status === 'SHIPPED' ? '#D1FAE5' : '#FEF3C7',
                              color: workflowMap[o.id].status === 'SHIPPED' ? '#065F46' : '#92400E',
                            }}>
                              {workflowMap[o.id].status === 'SHIPPED' ? '🚚 Kargoya Verildi' : '📦 Hazırlandı'}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="date-cell">
                        <span className="date-main">
                          {new Date(o.createdAt).toLocaleDateString('tr-TR', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })}
                        </span>
                        <span className="date-time">
                          {new Date(o.createdAt).toLocaleTimeString('tr-TR', {
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="customer-cell">
                        <span className="customer-name">{o.customerName}</span>
                        {o.email && <span className="customer-email">{o.email}</span>}
                      </div>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      {o.lineItems.length === 0 ? (
                        <small style={{ color: 'var(--text-muted)' }}>—</small>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 360 }}>
                          {o.lineItems.slice(0, 3).map((li, idx) => (
                            <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12 }}>
                              <div style={{
                                width: 28, height: 28, borderRadius: 4, flexShrink: 0,
                                background: li.image ? `url(${li.image}) center/cover` : 'var(--hover-bg)',
                                border: '1px solid var(--border-color)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 12,
                              }}>{!li.image && '📦'}</div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                  fontWeight: 600,
                                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }} title={li.title}>{li.title}</div>
                                <div style={{ display: 'flex', gap: 8, fontSize: 10, color: 'var(--text-muted)' }}>
                                  {li.barcode && (
                                    <span title="Barkod" style={{
                                      fontFamily: 'monospace', background: 'var(--hover-bg)',
                                      padding: '1px 6px', borderRadius: 3,
                                    }}>🏷 {li.barcode}</span>
                                  )}
                                  {!li.barcode && li.sku && (
                                    <span title="SKU" style={{
                                      fontFamily: 'monospace', background: 'var(--hover-bg)',
                                      padding: '1px 6px', borderRadius: 3,
                                    }}>SKU: {li.sku}</span>
                                  )}
                                </div>
                              </div>
                              <span style={{
                                background: '#EFF6FF', color: '#1D4ED8',
                                padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                                flexShrink: 0,
                              }}>×{li.quantity}</span>
                            </div>
                          ))}
                          {o.lineItems.length > 3 && (
                            <div style={{
                              fontSize: 11, color: 'var(--text-muted)',
                              fontStyle: 'italic', paddingLeft: 36,
                            }}>
                              +{o.lineItems.length - 3} ürün daha · Toplam {o.totalQuantity} adet
                            </div>
                          )}
                          {o.lineItems.length <= 3 && o.lineItems.length > 1 && (
                            <div style={{
                              fontSize: 10, color: 'var(--text-muted)',
                              paddingLeft: 36, paddingTop: 2,
                            }}>
                              Toplam {o.totalQuantity} adet ({o.lineItems.length} ürün)
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td>
                      {ful ? (
                        <span className={`status-badge ${ful.cls}`}>{ful.label}</span>
                      ) : (
                        <span className="status-badge pending">—</span>
                      )}
                    </td>
                    <td>
                      {fin ? (
                        <span className={`status-badge ${fin.cls}`}>{fin.label}</span>
                      ) : (
                        <span className="status-badge pending">—</span>
                      )}
                    </td>
                    <td>
                      <div className="order-total-cell">
                        <span className="order-total-amount">{formatCurrency(o.total, o.currency)}</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="table-footer">
        <div>
          Sayfa başına:
          <select
            className="row-count-select"
            value={first}
            onChange={e => navigate({ first: e.target.value, after: undefined })}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span>
            {rows.length} sipariş gösteriliyor
            {mpCount > 0 && source === 'ALL' && <span style={{ color: 'var(--text-muted)' }}> · {mpCount} pazaryeri</span>}
          </span>
          {(source === 'ALL' || source === 'SHOPIFY') && (
            <>
              {sp.get('after') && (
                <button className="btn-secondary" onClick={() => navigate({ after: undefined })} disabled={pending}>
                  « İlk Sayfa
                </button>
              )}
              {data.pageInfo.hasNextPage && (
                <button
                  className="btn-secondary"
                  onClick={() => navigate({ after: data.pageInfo.endCursor ?? undefined })}
                  disabled={pending}
                >
                  Shopify Sonraki Sayfa »
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
