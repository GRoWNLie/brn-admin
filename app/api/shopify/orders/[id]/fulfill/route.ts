import { NextRequest, NextResponse } from 'next/server'
import { createFulfillment } from '@/lib/shopify-orders'
import { requirePermission } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

// POST /api/shopify/orders/[id]/fulfill
// Body: { fulfillmentOrderId, trackingCompany?, trackingNumber?, trackingUrl?, notifyCustomer? }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requirePermission('orders.modify')
  if (error) return error

  const body = await req.json().catch(() => ({}))

  if (!body.fulfillmentOrderId) {
    return NextResponse.json(
      { success: false, message: 'fulfillmentOrderId gerekli' },
      { status: 400 }
    )
  }

  try {
    const result = await createFulfillment({
      fulfillmentOrderId: body.fulfillmentOrderId,
      trackingCompany: body.trackingCompany,
      trackingNumber: body.trackingNumber,
      trackingUrl: body.trackingUrl,
      notifyCustomer: body.notifyCustomer,
    })
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.errors.map(e => e.message).join('; ') },
        { status: 400 }
      )
    }
    await logAudit({
      userId: user.id, userEmail: user.email!,
      action: 'orders.fulfill', resource: `order:${params.id}`,
      detail: { trackingNumber: body.trackingNumber, trackingCompany: body.trackingCompany },
      req,
    })
    return NextResponse.json({ success: true, fulfillmentId: result.fulfillmentId })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}
