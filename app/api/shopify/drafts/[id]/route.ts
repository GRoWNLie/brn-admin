import { NextRequest, NextResponse } from 'next/server'
import { deleteDraftOrder, completeDraftOrder, sendDraftInvoice } from '@/lib/shopify-commerce'

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const r = await deleteDraftOrder(decodeURIComponent(params.id))
  if (!r.success) {
    return NextResponse.json(
      { success: false, message: r.errors.map((e: any) => e.message).join('; ') },
      { status: 400 }
    )
  }
  return NextResponse.json({ success: true })
}

// POST /api/shopify/drafts/[id]?action=complete|send_invoice
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const action = req.nextUrl.searchParams.get('action')
  const id = decodeURIComponent(params.id)

  if (action === 'complete') {
    const r = await completeDraftOrder(id)
    if (!r.success) {
      return NextResponse.json(
        { success: false, message: r.errors.map((e: any) => e.message).join('; ') },
        { status: 400 }
      )
    }
    return NextResponse.json({ success: true, orderId: r.orderId })
  }

  if (action === 'send_invoice') {
    const r = await sendDraftInvoice(id)
    if (!r.success) {
      return NextResponse.json(
        { success: false, message: r.errors.map((e: any) => e.message).join('; ') },
        { status: 400 }
      )
    }
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ success: false, message: 'action gerekli (complete|send_invoice)' }, { status: 400 })
}
