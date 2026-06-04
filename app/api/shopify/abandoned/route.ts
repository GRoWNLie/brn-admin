import { NextRequest, NextResponse } from 'next/server'
import { getAbandonedCheckouts } from '@/lib/shopify-commerce'

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  try {
    const r = await getAbandonedCheckouts({
      first: parseInt(sp.get('first') || '25', 10),
      after: sp.get('after'),
    })
    return NextResponse.json({ success: true, ...r })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}
