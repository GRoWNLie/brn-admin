import { Suspense } from 'react'
import { getOrders } from '@/lib/shopify-data'
import { prisma } from '@/lib/prisma'
import { getWorkflowMap } from '@/lib/order-workflow'
import OrdersClient from './OrdersClient'
import ShopifyAccessDeniedHelp from '@/components/ShopifyAccessDeniedHelp'

export const dynamic = 'force-dynamic'

async function getMarketplaceOrders() {
  try {
    const rows = await prisma.marketplaceOrder.findMany({ orderBy: { orderedAt: 'desc' }, take: 300 })
    return rows.map(r => ({
      id: r.id, marketplace: r.marketplace, orderNumber: r.orderNumber, status: r.status,
      customerName: r.customerName, total: r.total, currency: r.currency,
      lineCount: r.lineCount, orderedAt: r.orderedAt ? r.orderedAt.toISOString() : null,
    }))
  } catch { return [] }
}

async function OrdersData({
  search, after, first, financialStatus, fulfillmentStatus,
}: {
  search?: string
  after?: string
  first: number
  financialStatus?: string
  fulfillmentStatus?: string
}) {
  const marketplaceOrders = await getMarketplaceOrders()
  try {
    const result = await getOrders({
      first, after: after || null, search,
      financialStatus, fulfillmentStatus,
    })
    const workflowMap = await getWorkflowMap(result.orders.map(o => o.id)).catch(() => ({}))
    return <OrdersClient data={result} search={search ?? ''} first={first}
      financialStatus={financialStatus ?? ''} fulfillmentStatus={fulfillmentStatus ?? ''}
      marketplaceOrders={marketplaceOrders} workflowMap={workflowMap} />
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Bilinmeyen hata'
    const isAccessDenied = /Access denied|read_orders|read_all_orders|protected/i.test(msg)
    if (isAccessDenied) {
      return <ShopifyAccessDeniedHelp field="orders" rawMessage={msg} />
    }
    return (
      <div className="panel-card" style={{ borderLeft: '4px solid #DC2626' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#DC2626', marginBottom: 6 }}>
          ⚠️ Siparişler yüklenemedi
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{msg}</div>
      </div>
    )
  }
}

export default function OrdersPage({
  searchParams,
}: {
  searchParams: { search?: string; after?: string; first?: string; financial?: string; fulfillment?: string }
}) {
  const first = Math.min(parseInt(searchParams.first || '25', 10) || 25, 100)
  return (
    <div className="page-content">
      <div className="product-header">
        <h1 className="page-title">Siparişler <span className="info-icon">ⓘ</span></h1>
        <div className="product-actions-right">
          <button className="btn-secondary">Dışa Aktar</button>
          <button className="btn-primary">Sipariş Oluştur</button>
        </div>
      </div>

      <Suspense fallback={
        <div className="panel-card">
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            ⏳ Shopify siparişleri yükleniyor...
          </div>
        </div>
      }>
        <OrdersData
          search={searchParams.search}
          after={searchParams.after}
          first={first}
          financialStatus={searchParams.financial}
          fulfillmentStatus={searchParams.fulfillment}
        />
      </Suspense>
    </div>
  )
}
