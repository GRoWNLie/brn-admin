'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { DashboardSummary, formatCurrency } from '@/lib/shopify-data'
import DashboardWidgets from './DashboardWidgets'

const RANGE_LABELS: Record<number, string> = {
  1: 'Bugün',
  7: 'Son 7 Gün',
  30: 'Son 30 Gün',
  90: 'Son 90 Gün',
}

export default function DashboardClient({ summary }: { summary: DashboardSummary }) {
  const router = useRouter()
  const sp = useSearchParams()
  const currentRange = parseInt(sp.get('range') || '7', 10)

  function setRange(days: number) {
    const params = new URLSearchParams(sp.toString())
    params.set('range', String(days))
    router.push(`/dashboard?${params.toString()}`)
  }

  const maxDaily = Math.max(...summary.dailySales.map(d => d.total), 1)
  const dayNames = ['Paz', 'Pts', 'Sal', 'Çar', 'Per', 'Cum', 'Cts']

  return (
    <>
      <div className="filter-bar">
        <div className="filter-left">
          <div className="custom-select">
            <div className="select-selected">
              <span className="text">Tüm Satış Kanalları</span>
              <span className="arrow">▼</span>
            </div>
          </div>
          <select
            value={currentRange}
            onChange={e => setRange(parseInt(e.target.value, 10))}
            className="form-select"
            style={{ minWidth: 160 }}
          >
            <option value={1}>Bugün</option>
            <option value={7}>Son 7 Gün</option>
            <option value={30}>Son 30 Gün</option>
            <option value={90}>Son 90 Gün</option>
          </select>
          <span className="filter-text">{RANGE_LABELS[currentRange] || `Son ${currentRange} Gün`}</span>
        </div>
        <div className="filter-right">
          <div className="visitor-box">
            <span className="visitor-dot" />
            Shopify Admin API
          </div>
        </div>
      </div>

      <div className="panel-card">
        <div className="metrics-grid">
          <div className="metric-item active">
            <div className="metric-title">Toplam Satış</div>
            <div className="metric-value-row">
              <span className="metric-value">{formatCurrency(summary.totalSales, summary.currency)}</span>
              <span className="metric-percent">{summary.shopName}</span>
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-title">Sipariş Sayısı</div>
            <div className="metric-value-row">
              <span className="metric-value">{summary.orderCount}</span>
              <span className="metric-percent">son {summary.rangeDays} gün</span>
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-title">Oturum (Sessions)</div>
            <div className="metric-value-row">
              <span className="metric-value">
                {summary.sessions !== null ? summary.sessions.toLocaleString('tr-TR') : '—'}
              </span>
              <span className="metric-percent">
                {summary.sessions !== null ? 'online store' : 'veri yok'}
              </span>
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-title">Dönüşüm Oranı</div>
            <div className="metric-value-row">
              <span className="metric-value">
                {summary.conversionRate !== null ? `%${summary.conversionRate.toFixed(2)}` : '—'}
              </span>
              <span className="metric-percent">
                {summary.conversionRate !== null ? 'sipariş/oturum' : 'oturum verisi yok'}
              </span>
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-title">İadeler</div>
            <div className="metric-value-row">
              <span className="metric-value">{formatCurrency(summary.totalRefunds, summary.currency)}</span>
              <span className="metric-percent">{summary.rangeDays} gün</span>
            </div>
          </div>
        </div>

        {/* Çizgi grafik (gerçek günlük satış) */}
        <div className="chart-placeholder" style={{ position: 'relative', height: 180 }}>
          <div className="chart-y-axis">
            <span>{formatCurrency(maxDaily, summary.currency)}</span>
            <span>{formatCurrency(maxDaily * 0.75, summary.currency)}</span>
            <span>{formatCurrency(maxDaily * 0.5, summary.currency)}</span>
            <span>{formatCurrency(maxDaily * 0.25, summary.currency)}</span>
            <span>{summary.currency === 'TRY' ? '₺ 0' : '0'}</span>
          </div>
          <div className="chart-grid-lines">
            <div className="grid-line" /><div className="grid-line" />
            <div className="grid-line" /><div className="grid-line" /><div className="grid-line" />
          </div>

          {/* SVG çizgi */}
          <svg
            style={{ position: 'absolute', left: 60, right: 16, top: 0, bottom: 30, width: 'calc(100% - 76px)', height: 'calc(100% - 30px)' }}
            viewBox={`0 0 ${Math.max(summary.dailySales.length - 1, 1) * 100} 100`}
            preserveAspectRatio="none"
          >
            <polyline
              fill="none"
              stroke="#2563EB"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
              points={summary.dailySales.map((d, i) =>
                `${i * 100},${100 - (d.total / maxDaily) * 100}`
              ).join(' ')}
            />
            {summary.dailySales.map((d, i) => (
              <circle
                key={i}
                cx={i * 100}
                cy={100 - (d.total / maxDaily) * 100}
                r="3"
                fill="#2563EB"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>

          <div className="chart-x-axis">
            {summary.dailySales.map((d, i) => {
              const dt = new Date(d.date)
              return <span key={i}>{dayNames[dt.getDay()]} {dt.getDate()}</span>
            })}
          </div>
        </div>
      </div>

      <div className="dashboard-grid-2">
        {/* En çok satanlar */}
        <div className="panel-card">
          <div className="card-header">
            <div className="card-title">En Çok Satanlar</div>
          </div>
          {summary.topProducts.length === 0 ? (
            <div className="empty-state">
              <div style={{ width: 80, height: 40, border: '2px solid var(--border-color)', borderRadius: 6, marginBottom: 10 }} />
              <div className="empty-state-title">Seçilen tarihte satış yok</div>
              <div className="empty-state-text">Farklı bir tarih aralığı deneyin.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {summary.topProducts.map((p, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 0', borderBottom: '1px solid var(--border-color)',
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 6,
                    background: 'var(--hover-bg)', overflow: 'hidden',
                    flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {p.image
                      ? <img src={p.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: 18 }}>📦</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 600,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{p.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.soldQty} adet satıldı</div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>#{i + 1}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Büyüme Metrikleri */}
        <div className="panel-card">
          <div className="card-header">
            <div className="card-title">Büyüme Metrikleri</div>
          </div>
          <div className="growth-list">
            {[
              {
                label: 'Ort. Sipariş Tutarı',
                value: formatCurrency(summary.averageOrderValue, summary.currency),
              },
              {
                label: 'Toplam Ürün',
                value: summary.totalProducts.toLocaleString('tr-TR'),
              },
              {
                label: 'Toplam Müşteri',
                value: summary.totalCustomers.toLocaleString('tr-TR'),
              },
              {
                label: 'İade Oranı',
                value: `%${summary.totalSales > 0 ? ((summary.totalRefunds / summary.totalSales) * 100).toFixed(2) : '0.00'}`,
              },
            ].map(item => (
              <div key={item.label} className="growth-item">
                <div className="growth-item-header">
                  <span>{item.label}</span>
                  <span>—</span>
                </div>
                <div className="growth-item-value">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <DashboardWidgets />
    </>
  )
}
