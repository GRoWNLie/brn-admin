'use client'

import { useEffect, useState } from 'react'
import { formatCurrency } from '@/lib/shopify-data'

interface Report {
  completedOrders: number
  abandonedCount: number
  abandonedValue: number
  abandonmentRate: number
  recoveredCount: number
  conversionFromCheckout: number
  averageOrderValue: number
  totalSales: number
  currency: string
}

function Donut({ pct, color }: { pct: number; color: string }) {
  const r = 52
  const c = 2 * Math.PI * r
  const off = c - (Math.min(100, Math.max(0, pct)) / 100) * c
  return (
    <svg width="130" height="130" viewBox="0 0 130 130">
      <circle cx="65" cy="65" r={r} fill="none" stroke="var(--hover-bg)" strokeWidth="14" />
      <circle cx="65" cy="65" r={r} fill="none" stroke={color} strokeWidth="14"
        strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
        transform="rotate(-90 65 65)" />
      <text x="65" y="62" textAnchor="middle" fontSize="22" fontWeight="800" fill="var(--text-main)">
        %{pct.toFixed(1)}
      </text>
      <text x="65" y="82" textAnchor="middle" fontSize="11" fill="var(--text-muted)">dönüşüm</text>
    </svg>
  )
}

export default function ConversionReportPage() {
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState(30)

  async function load(r: number) {
    setLoading(true)
    try {
      const res = await fetch(`/api/shopify/reports/conversion?range=${r}`)
      const data = await res.json()
      if (data.success) setReport(data)
    } finally { setLoading(false) }
  }
  useEffect(() => { load(range) }, [range])

  return (
    <div className="page-content">
      <div className="product-header">
        <h1 className="page-title">Dönüşüm Raporu</h1>
        <div className="product-actions-right">
          <select className="form-select" style={{ minWidth: 140 }}
            value={range} onChange={e => setRange(parseInt(e.target.value, 10))}>
            <option value={7}>Son 7 Gün</option>
            <option value={30}>Son 30 Gün</option>
            <option value={90}>Son 90 Gün</option>
          </select>
        </div>
      </div>

      {loading || !report ? (
        <div className="panel-card">
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>⏳ Yükleniyor...</div>
        </div>
      ) : (
        <>
          {/* Funnel + Donut */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: 16 }}>
            <div className="panel-card">
              <div className="settings-section-title">Checkout → Sipariş Hunisi</div>
              {(() => {
                const totalCheckouts = report.completedOrders + report.abandonedCount
                const steps = [
                  { label: '🛒 Başlatılan Checkout', value: totalCheckouts, color: '#2563EB' },
                  { label: '✅ Tamamlanan Sipariş', value: report.completedOrders, color: '#059669' },
                  { label: '🛟 Geri Kazanılan', value: report.recoveredCount, color: '#7C3AED' },
                ]
                const max = Math.max(totalCheckouts, 1)
                return steps.map(s => (
                  <div key={s.label} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span>{s.label}</span>
                      <strong>{s.value}</strong>
                    </div>
                    <div style={{ height: 22, background: 'var(--hover-bg)', borderRadius: 6, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${(s.value / max) * 100}%`, background: s.color,
                        minWidth: s.value > 0 ? 6 : 0, borderRadius: 6,
                      }} />
                    </div>
                  </div>
                ))
              })()}
            </div>
            <div className="panel-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <Donut pct={report.conversionFromCheckout} color="#059669" />
            </div>
          </div>

          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            <div className="panel-card">
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Sepet Bırakma Oranı</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#DC2626', marginTop: 4 }}>
                %{report.abandonmentRate.toFixed(1)}
              </div>
            </div>
            <div className="panel-card">
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Terk Edilen Sepet</div>
              <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>{report.abandonedCount}</div>
            </div>
            <div className="panel-card">
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Kaçan Potansiyel Ciro</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#F59E0B', marginTop: 4 }}>
                {formatCurrency(report.abandonedValue, report.currency)}
              </div>
            </div>
            <div className="panel-card">
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Ort. Sipariş Tutarı</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#2563EB', marginTop: 4 }}>
                {formatCurrency(report.averageOrderValue, report.currency)}
              </div>
            </div>
          </div>

          <div className="panel-card" style={{ background: 'var(--hover-bg)' }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              💡 <strong>İpucu:</strong> Sepet bırakma oranın %{report.abandonmentRate.toFixed(0)} seviyesinde.
              {report.abandonedCount > 0 && (
                <> <strong>{formatCurrency(report.abandonedValue, report.currency)}</strong> tutarındaki kaçan satışı,
                Pazarlama → Email/SMS Otomasyon ile sepet hatırlatma akışı kurarak geri kazanabilirsin.</>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
