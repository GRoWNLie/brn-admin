import { NextRequest, NextResponse } from 'next/server'
import { getCustomers } from '@/lib/shopify-data'

// GET /api/shopify/customers?first=100&search=...
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  try {
    const r = await getCustomers({
      first: parseInt(sp.get('first') || '25', 10),
      after: sp.get('after'),
      search: sp.get('search') || undefined,
    })
    return NextResponse.json({ success: true, ...r })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}
