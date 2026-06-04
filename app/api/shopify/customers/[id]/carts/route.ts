import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'
import { getCustomerAbandonedCarts } from '@/lib/shopify-commerce'

// GET /api/shopify/customers/[id]/carts?email=...
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission('customers.view')
  if (error) return error
  const customerGid = decodeURIComponent(params.id)
  const email = req.nextUrl.searchParams.get('email')
  const numericId = customerGid.split('/').pop() || ''

  // Canlı sepet (beacon) — email veya customerId ile eşle, son 7 gün
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const liveRows = await prisma.cartSession.findMany({
    where: {
      updatedAt: { gte: since },
      OR: [
        ...(email ? [{ customerEmail: email }] : []),
        { customerId: numericId },
        { customerId: customerGid },
      ],
    },
    orderBy: { updatedAt: 'desc' },
    take: 5,
  }).catch(() => [])

  const live = liveRows.map(r => {
    let items: any[] = []
    try { items = JSON.parse(r.items || '[]') } catch {}
    return { id: r.id, total: r.total, currency: r.currency, itemCount: r.itemCount, updatedAt: r.updatedAt, lines: items }
  })

  const abandoned = await getCustomerAbandonedCarts(customerGid)

  return NextResponse.json({ success: true, live, abandoned })
}
