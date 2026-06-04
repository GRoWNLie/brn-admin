'use client'

import { useEffect, useState } from 'react'
import { formatCurrency } from '@/lib/shopify-data'

interface Row {
  productId: string | null
  title: string
  quantity: number
  revenue: number
  orderCount: number
}

interface Report {
  rows: Row[]
  totalUnits: number
  totalRevenue: number
  currency: string
  productCount: number
}

export default function ProductPerformancePage() {
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState(30)

  async function load(r: number) {
    setLoading(true)
    try {
      const res = await fetch(`/api/shopify/reports/products?range=${r}`)
      const data = await res.json()
      if (data.success) setReport(data)
    } finally { setLoading(false) }
  }
  useEffect(() => { load(range) }, [range])

  function exportCsv() {
    if (!report) return
    const lines = ['Sıra,Ürün,Satış Adedi,Ciro,Sipariş Sayısı']
    report.rows.forEach((r, i) =>
      lines.push(`${i + 1},"${r.title.replace(/"/g, '""')}",${r.quantity},${r.revenue.toFixed(2)},${r.orderCount}`)
    )
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `urun-performansi-${range}gun.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const maxRevenue = Math.max(...(report?.rows.map(r => r.revenue) || [1]), 1)
  const top = report?.rows.slice(0, 50) ?? []

  return (
    <div className="page-content">
      <div className="product-header">
        <h1 className="page-title">Ürün Performansı</h1>
        <div className="product-actions-right" style={{ display: 'flex', gap: 8 }}>
          <select className="form-select" style={{ minWidth: 140 }}
            value={range} onChange={e => setRange(parseInt(e.target.value, 10))}>
            <option value={7}>Son 7 Gün</option>
            <option value={30}>Son 30 Gün</option>
            <option value={90}>Son 90 Gün</option>
          </select>
          <button className="btn-secondary" onClick={exportCsv} disabled={!report}>
            📥 CSV İndir
          </button>
        </div>
      </div>

      {loading || !report ? (
        <div className="panel-card">
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>⏳ Yükleniyor...</div>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <div className="panel-card">
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Satılan Ürün Çeşidi</div>
              <div style={{ fontSize: 32, fontWeight: 800, marginTop: 4 }}>{report.productCount}</div>
            </div>
            <div className="panel-card">
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Toplam Satış Adedi</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#2563EB', marginTop: 4 }}>{report.totalUnits}</div>
            </div>
            <div className="panel-card">
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Toplam Ciro</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#059669', marginTop: 4 }}>
                {formatCurrency(report.totalRevenue, report.currency)}
              </div>
            </div>
          </div>

          {/* Ürün sıralaması */}
          <div className="panel-card">
            <div className="settings-section-title">En Çok Satan Ürünler (Ciro)</div>
            {top.length === 0 ? (
              <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>
                Bu dönemde satış bulunamadı.
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>#</th>
                    <th>Ürün</th>
                    <th>Adet</th>
                    <th>Sipariş</th>
                    <th>Ciro</th>
                    <th>Görsel</th>
                  </tr>
                </thead>
                <tbody>
                  {top.map((r, i) => (
                    <tr key={(r.productId ?? r.title) + i}>
                      <td><strong>{i + 1}</strong></td>
                      <td>{r.title}</td>
                      <td>{r.quantity}</td>
                      <td>{r.orderCount}</td>
                      <td><strong style={{ color: '#059669' }}>{formatCurrency(r.revenue, report.currency)}</strong></td>
                      <td style={{ width: 200 }}>
                        <div style={{
                          height: 8, background: 'var(--hover-bg)', borderRadius: 4, overflow: 'hidden',
                        }}>
                          <div style={{
                            height: '100%',
                            width: `${(r.revenue / maxRevenue) * 100}%`,
                            background: 'linear-gradient(90deg, #7C3AED, #EC4899)',
                            minWidth: r.revenue > 0 ? 4 : 0,
                          }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}
