import { NextRequest, NextResponse } from 'next/server'
import { getDiscounts, createDiscountBasic } from '@/lib/shopify-commerce'

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  try {
    const r = await getDiscounts({
      first: parseInt(sp.get('first') || '25', 10),
      after: sp.get('after'),
      search: sp.get('search') || undefined,
    })
    return NextResponse.json({ success: true, ...r })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  if (!body.code || !body.title) {
    return NextResponse.json({ success: false, message: 'code ve title gerekli' }, { status: 400 })
  }
  const r = await createDiscountBasic({
    code: body.code,
    title: body.title,
    percentage: body.percentage,
    fixedAmount: body.fixedAmount,
    startsAt: body.startsAt,
    endsAt: body.endsAt,
    usageLimit: body.usageLimit,
    appliesOncePerCustomer: body.appliesOncePerCustomer,
  })
  if (!r.success) {
    return NextResponse.json(
      { success: false, message: r.errors.map((e: any) => e.message).join('; ') },
      { status: 400 }
    )
  }
  return NextResponse.json({ success: true, id: r.id })
}
