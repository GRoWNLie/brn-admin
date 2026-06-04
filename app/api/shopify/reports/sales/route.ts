import { NextRequest, NextResponse } from 'next/server'
import { getSalesReport } from '@/lib/shopify-commerce'

export async function GET(req: NextRequest) {
  const rangeDays = parseInt(req.nextUrl.searchParams.get('range') || '30', 10) || 30
  try {
    const report = await getSalesReport(rangeDays)
    return NextResponse.json({ success: true, ...report })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}
