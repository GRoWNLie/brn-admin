import { NextResponse } from 'next/server'
import { getSession } from '@/lib/storefront-session'
import { getCustomer, getOrders, getAddresses, getTopOrdered, getRecentlyViewed } from '@/lib/shopify-customer-account'

// GET /api/storefront/[storeId]/me?include=orders,addresses,recent,top
export async function GET(req: Request, { params }: { params: { storeId: string } }) {
  const storeId = Number(params.storeId)
  const s = await getSession(storeId)
  if (!s || !s.customerId) return NextResponse.json({ success: false, authenticated: false }, { status: 401 })

  const url = new URL(req.url)
  const include = (url.searchParams.get('include') || '').split(',')

  const out: any = { success: true, authenticated: true, customer: await getCustomer(storeId, s.customerId) }
  if (include.includes('orders')) out.orders = await getOrders(storeId, s.customerId)
  if (include.includes('addresses')) out.addresses = await getAddresses(storeId, s.customerId)
  if (include.includes('top')) out.top = await getTopOrdered(storeId, s.customerId)
  if (include.includes('recent')) {
    let gids: string[] = []
    try { gids = JSON.parse(s.recentViewed || '[]') } catch {}
    out.recent = await getRecentlyViewed(storeId, gids)
  }
  return NextResponse.json(out)
}
