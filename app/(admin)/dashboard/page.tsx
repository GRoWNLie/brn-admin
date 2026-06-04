import { Suspense } from 'react'
import { getDashboardSummary, formatCurrency, DashboardSummary } from '@/lib/shopify-data'
import DashboardClient from './DashboardClient'
import ShopifyAccessDeniedHelp from '@/components/ShopifyAccessDeniedHelp'

export const dynamic = 'force-dynamic'

async function DashboardData({ rangeDays }: { rangeDays: number }) {
  let summary: DashboardSummary | null = null
  let error: string | null = null
  try {
    summary = await getDashboardSummary(rangeDays)
  } catch (e) {
    error = e instanceof Error ? e.message : 'Shopify verisi alınamadı'
  }

  if (error) {
    const isAccessDenied = /Access denied|read_orders|read_all_orders|protected/i.test(error)
    if (isAccessDenied) {
      return <ShopifyAccessDeniedHelp field="orders" rawMessage={error} />
    }
    return (
      <div className="panel-card" style={{ borderLeft: '4px solid #DC2626' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#DC2626', marginBottom: 6 }}>
          ⚠️ Shopify Bağlantı Hatası
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>
          {error}
        </div>
      </div>
    )
  }

  return <DashboardClient summary={summary!} />
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { range?: string }
}) {
  // Shopify Dashboard'ın varsayılanı 30 gün — aynısını kullan
  const rangeDays = parseInt(searchParams.range || '30', 10) || 30

  return (
    <div className="dashboard-content">
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardData rangeDays={rangeDays} />
      </Suspense>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="panel-card">
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
        ⏳ Shopify verisi yükleniyor...
      </div>
    </div>
  )
}
