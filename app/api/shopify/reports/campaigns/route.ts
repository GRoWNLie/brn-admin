import { NextRequest, NextResponse } from 'next/server'
import { getCampaignUsageReport } from '@/lib/shopify-commerce'
import { requirePermission } from '@/lib/auth'

// GET /api/shopify/reports/campaigns?range=30
export async function GET(req: NextRequest) {
  const { error } = await requirePermission('orders.view')
  if (error) return error
  const range = Math.min(Math.max(parseInt(req.nextUrl.searchParams.get('range') || '30', 10) || 30, 1), 365)
  try {
    const report = await getCampaignUsageReport(range)
    return NextResponse.json({ success: true, ...report })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}
