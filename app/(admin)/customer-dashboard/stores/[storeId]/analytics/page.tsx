'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

export default function StoreAnalyticsPage() {
  const { storeId } = useParams<{ storeId: string }>()
  const [range, setRange] = useState(30)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/customer-dashboard/stores/${storeId}/analytics?range=${range}`)
      .then(r => r.json())
      .then(d => { if (d.success) setData(d) })
      .finally(() => setLoading(false))
  }, [storeId, range])

  const maxDaily = Math.max(...(data?.daily?.map((d: any) => d.sessions) || [1]), 1)

  return (
    <div className="page-content">
      <div className="product-header">
        <div>
          <Link href={`/customer-dashboard/stores/${storeId}`} style={{ color: 'var(--text-muted)', fontSize: 12, textDecoration: 'none' }}>← Mağaza Detay</Link>
          <h1 className="page-title">📊 Storefront Analitik</h1>
        </div>
        <select className="form-select" value={range} onChange={e => setRange(parseInt(e.target.value, 10))}>
          <option value={7}>Son 7 Gün</option>
          <option value={30}>Son 30 Gün</option>
          <option value={90}>Son 90 Gün</option>
          <option value={365}>Son 1 Yıl</option>
        </select>
      </div>

      {loading || !data ? <div className="panel-card" style={{ padding: 40, textAlign: 'center' }}>⏳ Yükleniyor...</div> : (
        <>
          <div className="dashboard-grid-2" style={{ gridTemplateColumns: 'repeat(5,1fr)' }}>
            <Stat label="👥 Üye Müşteri" value={data.stats.totalCustomers} color="#2563EB" />
            <Stat label="🟢 Aktif (24sa)" value={data.stats.activeSessions} color="#059669" />
            <Stat label="🌐 Session" value={data.stats.totalSessions} sub={`${range}g`} color="#7C3AED" />
            <Stat label="📝 Kayıt" value={data.stats.signupsInRange} sub={`${range}g`} color="#D97706" />
            <Stat label="🎯 Dönüşüm" value={`%${data.stats.conversionRate}`} sub="kayıt/session" color="#EC4899" />
          </div>

          <div className="panel-card">
            <div className="settings-section-title">📈 Günlük Session Trendi</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 140, padding: '0 4px', borderBottom: '1px solid var(--border-color)' }}>
              {data.daily.map((d: any) => (
                <div key={d.date} title={`${d.date}: ${d.sessions} session, ${d.signups} kayıt`}
                  style={{
                    flex: 1, minWidth: 4,
                    height: `${(d.sessions / maxDaily) * 100}%`,
                    background: 'linear-gradient(180deg,#7C3AED,#EC4899)',
                    borderRadius: '3px 3px 0 0',
                  }} />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>
              <span>{data.daily[0]?.date}</span>
              <span>{data.daily[data.daily.length - 1]?.date}</span>
            </div>
          </div>

          <div className="panel-card" style={{ padding: 0 }}>
            <div className="settings-section-title" style={{ padding: '14px 16px 0' }}>🔝 En Çok Görüntülenen Ürünler</div>
            {data.topProducts.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Henüz veri yok.</div>
            ) : (
              <table className="data-table">
                <thead><tr><th>#</th><th>Ürün (GID)</th><th>Görüntülenme</th></tr></thead>
                <tbody>
                  {data.topProducts.map((p: any, i: number) => (
                    <tr key={p.ref}>
                      <td>{i + 1}</td>
                      <td><code style={{ fontSize: 11 }}>{p.ref}</code></td>
                      <td><strong>{p.count}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="panel-card" style={{ background: 'var(--hover-bg)', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            ℹ️ Veriler storefront session ve CustomerActivity'den geliyor. Session başlatan her ziyaretçi sayılır; "kayıt" o aralıkta açılan ve customerId atanmış session'dır. Toplam <strong>{data.stats.pageViews}</strong> sayfa/aktivite kaydı var.
          </div>
        </>
      )}
    </div>
  )
}

function Stat({ label, value, sub, color }: { label: string; value: any; sub?: string; color: string }) {
  return (
    <div className="panel-card" style={{ borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color, marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}
