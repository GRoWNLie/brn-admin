'use client'

import { useEffect, useState } from 'react'
import { formatCurrency } from '@/lib/shopify-data'

interface Row {
  code: string; title: string; status: string; usageCount: number
  ordersInRange: number; quantityInRange: number; revenueInRange: number; summary: string
}
interface Report {
  rows: Row[]; currency: string; totalOrders: number; totalQuantity: number; totalRevenue: number; rangeDays: number
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: 'Aktif', cls: 'delivered' },
  EXPIRED: { label: 'Süresi Doldu', cls: 'cancelled' },
  SCHEDULED: { label: 'Planlandı', cls: 'pending' },
  UNKNOWN: { label: '—', cls: 'pending' },
}

export default function CampaignReportPage() {
  const [range, setRange] = useState(30)
  const [data, setData] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  async function load() {
    setLoading(true); setErr(null)
    try {
      const res = await fetch(`/api/shopify/reports/campaigns?range=${range}`)
      const d = await res.json()
      if (d.success) setData(d); else setErr(d.message || 'Rapor alınamadı')
    } catch (e: any) { setErr(e?.message || 'Bağlantı hatası') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [range])

  function exportCsv() {
    if (!data) return
    const headers = ['Kod', 'Başlık', 'Durum', 'Toplam Kullanım', `Sipariş (${range}g)`, 'Satılan Adet', 'Ciro']
    const lines = data.rows.map(r => [r.code, r.title, r.status, r.usageCount, r.ordersInRange, r.quantityInRange, r.revenueInRange.toFixed(2)]
      .map(v => { const s = String(v); return s.includes(',') ? `"${s}"` : s }).join(','))
    const csv = '﻿' + [headers.join(','), ...lines].join('\r\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    a.download = `kampanya-raporu-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  const maxOrders = Math.max(...(data?.rows.map(r => r.ordersInRange) || [1]), 1)

  return (
    <div className="page-content">
      <div className="product-header">
        <h1 className="page-title">🎟 Kampanya Kullanım Raporu</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select className="form-select" value={range} onChange={e => setRange(parseInt(e.target.value, 10))}>
            <option value={7}>Son 7 Gün</option>
            <option value={30}>Son 30 Gün</option>
            <option value={90}>Son 90 Gün</option>
            <option value={365}>Son 1 Yıl</option>
          </select>
          <button className="btn-secondary" onClick={exportCsv} disabled={!data}>⬇ CSV</button>
        </div>
      </div>

      <div className="dashboard-grid-2" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <div className="panel-card" style={{ borderTop: '3px solid #2563EB' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>🛒 Kuponlu Sipariş ({range}g)</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#2563EB', marginTop: 4 }}>{data?.totalOrders ?? '—'}</div>
        </div>
        <div className="panel-card" style={{ borderTop: '3px solid #7C3AED' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>📦 Satılan Ürün Adedi</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#7C3AED', marginTop: 4 }}>{data?.totalQuantity ?? '—'}</div>
        </div>
        <div className="panel-card" style={{ borderTop: '3px solid #059669' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>💰 Kuponlu Ciro</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#059669', marginTop: 4 }}>
            {data ? formatCurrency(data.totalRevenue, data.currency) : '—'}
          </div>
        </div>
      </div>

      <div className="panel-card" style={{ padding: 0 }}>
        {loading ? <div style={{ padding: 40, textAlign: 'center' }}>⏳ Yükleniyor...</div>
          : err ? <div style={{ padding: 24, color: '#B91C1C' }}>❌ {err}</div>
          : !data || data.rows.length === 0 ? (
            <div style={{ padding: 50, textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🎟</div>
              <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>Kampanya/kupon bulunamadı</div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Kupon</th><th>Durum</th><th>Toplam Kullanım</th>
                  <th>Sipariş ({range}g)</th><th>Satılan Adet</th><th>Ciro</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map(r => {
                  const st = STATUS_LABEL[r.status] ?? { label: r.status, cls: 'pending' }
                  return (
                    <tr key={r.code}>
                      <td><code style={{ background: 'var(--hover-bg)', padding: '2px 8px', borderRadius: 4 }}>{r.code}</code>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.title}{r.summary ? ` · ${r.summary}` : ''}</div></td>
                      <td><span className={`status-badge ${st.cls}`}>{st.label}</span></td>
                      <td><strong>{r.usageCount}</strong></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, maxWidth: 100, height: 6, background: 'var(--hover-bg)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${(r.ordersInRange / maxOrders) * 100}%`, height: '100%', background: 'linear-gradient(90deg,#7C3AED,#EC4899)' }} />
                          </div>
                          <span>{r.ordersInRange}</span>
                        </div>
                      </td>
                      <td>{r.quantityInRange}</td>
                      <td><strong style={{ color: '#059669' }}>{formatCurrency(r.revenueInRange, data.currency)}</strong></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
      </div>

      <div className="panel-card" style={{ background: 'var(--hover-bg)', fontSize: 12, color: 'var(--text-muted)' }}>
        ℹ️ <strong>Toplam Kullanım</strong> Shopify'ın tüm zamanlar sayacıdır. <strong>Sipariş/Adet/Ciro</strong> seçili tarih aralığındaki kuponlu siparişlerden hesaplanır.
      </div>
    </div>
  )
}
