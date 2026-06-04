import { NextRequest, NextResponse } from 'next/server'
import { createRefund } from '@/lib/shopify-orders'
import { requirePermission } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

// POST /api/shopify/orders/[id]/refund
// Body: { amount, currency, note?, notify?, refundLineItems? }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requirePermission('orders.modify')
  if (error) return error

  const body = await req.json().catch(() => ({}))
  const orderId = decodeURIComponent(params.id)

  try {
    const result = await createRefund({
      orderId,
      amount: body.amount || '0',
      currency: body.currency || 'TRY',
      note: body.note,
      notify: body.notify,
      refundLineItems: body.refundLineItems,
    })
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.errors.map(e => e.message).join('; ') },
        { status: 400 }
      )
    }
    await logAudit({
      userId: user.id, userEmail: user.email!,
      action: 'orders.refund', resource: `order:${orderId}`,
      detail: { amount: body.amount, currency: body.currency },
      req,
    })
    return NextResponse.json({ success: true, refundId: result.refundId })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}
