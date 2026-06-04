import { NextRequest, NextResponse } from 'next/server'
import { getProducts, getOrders, getCustomers } from '@/lib/shopify-data'
import { getCurrentUser } from '@/lib/auth'

// GET /api/search?q=... — global arama (ürün + sipariş + müşteri)
export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, message: 'Oturum yok' }, { status: 401 })

  const q = (req.nextUrl.searchParams.get('q') || '').trim()
  if (q.length < 2) return NextResponse.json({ success: true, products: [], orders: [], customers: [] })

  const [p, o, c] = await Promise.allSettled([
    getProducts({ first: 6, search: q }),
    getOrders({ first: 6, search: q }),
    getCustomers({ first: 6, search: q }),
  ])

  return NextResponse.json({
    success: true,
    products: p.status === 'fulfilled' ? p.value.products.map(x => ({ id: x.id, title: x.title, sku: x.sku, image: x.image })) : [],
    orders: o.status === 'fulfilled' ? o.value.orders.map(x => ({ id: x.id, name: x.name, customerName: x.customerName })) : [],
    customers: c.status === 'fulfilled' ? c.value.customers.map(x => ({ id: x.id, displayName: x.displayName, email: x.email })) : [],
  })
}
