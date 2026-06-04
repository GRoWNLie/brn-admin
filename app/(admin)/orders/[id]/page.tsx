import { getOrderDetail } from '@/lib/shopify-orders'
import OrderDetailClient from './OrderDetailClient'

export const dynamic = 'force-dynamic'

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const orderId = decodeURIComponent(params.id)

  let order = null
  let error: string | null = null
  try {
    order = await getOrderDetail(orderId)
    if (!order) error = 'Sipariş bulunamadı'
  } catch (e) {
    error = e instanceof Error ? e.message : 'Bilinmeyen hata'
  }

  if (error || !order) {
    return (
      <div className="page-content">
        <div className="product-header">
          <h1 className="page-title">Sipariş Detayı</h1>
        </div>
        <div className="panel-card" style={{ borderLeft: '4px solid #DC2626' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#DC2626' }}>⚠️ Hata</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>{error}</div>
        </div>
      </div>
    )
  }

  return <OrderDetailClient order={order} />
}
