import { NextRequest, NextResponse } from 'next/server'
import { getDraftOrders, createDraftOrder } from '@/lib/shopify-commerce'

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  try {
    const r = await getDraftOrders({
      first: parseInt(sp.get('first') || '25', 10),
      after: sp.get('after'),
    })
    return NextResponse.json({ success: true, ...r })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const r = await createDraftOrder(body)
  if (!r.success) {
    return NextResponse.json(
      { success: false, message: r.errors.map((e: any) => e.message).join('; ') },
      { status: 400 }
    )
  }
  return NextResponse.json({ success: true, draftOrder: r.draftOrder })
}
