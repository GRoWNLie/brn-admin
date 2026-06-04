'use client'

import { useEffect, useState } from 'react'
import { formatCurrency } from '@/lib/shopify-data'

interface Row {
  date: string
  orders: number
  totalSales: number
  netSales: number
}

interface Report {
  rows: Row[]
  totalOrders: number
  totalSales: number
  averageOrderValue: number
  currency: string
}

export default function SalesReportPage() {
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState(30)

  async function load(r: number) {
    setLoading(true)
    try {
      const res = await fetch(`/api/shopify/reports/sales?range=${r}`)
      const data = await res.json()
      if (data.success) setReport(data)
    } finally { setLoading(false) }
  }
  useEffect(() => { load(range) }, [range])

  function exportCsv() {
    if (!report) return
    const lines = ['Tarih,Sipariş,Brüt Satış,Net Satış']
    report.rows.forEach(r =>
      lines.push(`${r.date},${r.orders},${r.totalSales.toFixed(2)},${r.netSales.toFixed(2)}`)
    )
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `satis-raporu-${range}gun.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const maxSales = Math.max(...(report?.rows.map(r => r.totalSales) || [1]), 1)

  return (
    <div className="page-content">
      <div className="product-header">
        <h1 className="page-title">Satış Raporu</h1>
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
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Toplam Sipariş</div>
              <div style={{ fontSize: 32, fontWeight: 800, marginTop: 4 }}>{report.totalOrders}</div>
            </div>
            <div className="panel-card">
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Toplam Satış</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#059669', marginTop: 4 }}>
                {formatCurrency(report.totalSales, report.currency)}
              </div>
            </div>
            <div className="panel-card">
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Ort. Sipariş Tutarı</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#2563EB', marginTop: 4 }}>
                {formatCurrency(report.averageOrderValue, report.currency)}
              </div>
            </div>
          </div>

          {/* Günlük tablo + bar chart */}
          <div className="panel-card">
            <div className="settings-section-title">Günlük Performans</div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>Sipariş</th>
                  <th>Brüt Satış</th>
                  <th>Net Satış</th>
                  <th>Görsel</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map(r => (
                  <tr key={r.date}>
                    <td>{new Date(r.date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', weekday: 'short' })}</td>
                    <td>{r.orders}</td>
                    <td>{formatCurrency(r.totalSales, report.currency)}</td>
                    <td><strong style={{ color: '#059669' }}>{formatCurrency(r.netSales, report.currency)}</strong></td>
                    <td style={{ width: 200 }}>
                      <div style={{
                        height: 8, background: 'var(--hover-bg)', borderRadius: 4, overflow: 'hidden',
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${(r.totalSales / maxSales) * 100}%`,
                          background: 'linear-gradient(90deg, #2563EB, #10B981)',
                          minWidth: r.totalSales > 0 ? 4 : 0,
                        }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
