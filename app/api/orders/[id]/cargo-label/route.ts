import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { logAuditAuto } from '@/lib/audit'
import { getOrderDetail } from '@/lib/shopify-orders'
import { getCarrier, isCarrierCode, CarrierCode } from '@/lib/cargo-carriers'
import { markShipped } from '@/lib/order-workflow'

/**
 * POST /api/orders/[id]/cargo-label
 * Body: { carrier?, trackingNumber?, desi? }
 * Kargo barkodu (gönderi) oluşturur ve siparişi "Kargoya Verildi" işaretler.
 * Taşıyıcı yapılandırılmışsa gönderi oluşturup tracking alır; değilse verilen/üretilen no kullanılır.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission('orders.modify')
  if (error) return error
  const orderId = decodeURIComponent(params.id)
  const b = await req.json().catch(() => ({}))

  let trackingNumber: string | null = b.trackingNumber ? String(b.trackingNumber).trim() : null
  let carrier: string | null = b.carrier ? String(b.carrier).toUpperCase() : null
  let carrierMsg = ''

  // Taşıyıcı seçildiyse gerçek gönderi oluşturmayı dene
  if (carrier && isCarrierCode(carrier)) {
    try {
      const order = await getOrderDetail(orderId)
      const addr = order?.shippingAddress
      const r = await getCarrier(carrier as CarrierCode).createShipment({
        orderNumber: order?.name || orderId,
        recipientName: addr?.name || order?.customer?.displayName || 'Müşteri',
        phone: addr?.phone || order?.phone || '',
        address: [addr?.address1, addr?.address2].filter(Boolean).join(' ') || '—',
        city: addr?.city || '', district: addr?.province || '',
        desi: b.desi ? Number(b.desi) : 1,
      })
      carrierMsg = r.message
      if (r.ok && r.trackingNumber) trackingNumber = r.trackingNumber
    } catch (e: any) {
      carrierMsg = e?.message || 'Taşıyıcı gönderi hatası'
    }
  }

  // Tracking yoksa üret (barkod için)
  if (!trackingNumber) trackingNumber = `BRN${Date.now().toString().slice(-10)}`

  await markShipped(orderId, { orderName: b.orderName, carrier, trackingNumber })
  await logAuditAuto('order.cargo_label', { req, resource: `order:${orderId}`, detail: { carrier, trackingNumber } })

  return NextResponse.json({
    success: true,
    trackingNumber, carrier,
    message: `Kargo barkodu oluşturuldu (${trackingNumber}). Sipariş "Kargoya Verildi" olarak işaretlendi.${carrierMsg ? ` [${carrier}: ${carrierMsg}]` : ''}`,
  })
}

// GET — siparişin iş akışı durumu
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { getWorkflow } = await import('@/lib/order-workflow')
  const wf = await getWorkflow(decodeURIComponent(params.id))
  return NextResponse.json({ success: true, workflow: wf })
}
