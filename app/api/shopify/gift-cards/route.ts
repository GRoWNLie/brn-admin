import { NextRequest, NextResponse } from 'next/server'
import { getGiftCards, createGiftCard } from '@/lib/shopify-commerce'

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  try {
    const r = await getGiftCards({
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
  if (!body.initialValue) {
    return NextResponse.json({ success: false, message: 'initialValue gerekli' }, { status: 400 })
  }
  const r = await createGiftCard({
    initialValue: String(body.initialValue),
    note: body.note,
    expiresOn: body.expiresOn,
    customerId: body.customerId,
  })
  if (!r.success) {
    return NextResponse.json(
      { success: false, message: r.errors.map((e: any) => e.message).join('; ') },
      { status: 400 }
    )
  }
  return NextResponse.json({
    success: true,
    giftCardCode: r.giftCardCode,
    maskedCode: r.maskedCode,
  })
}
