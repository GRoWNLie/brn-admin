import { NextRequest, NextResponse } from 'next/server'
import { getProducts } from '@/lib/shopify-data'

// GET /api/shopify/low-stock?threshold=5
export async function GET(req: NextRequest) {
  const threshold = parseInt(req.nextUrl.searchParams.get('threshold') || '5', 10)
  try {
    const data = await getProducts({ first: 100 })
    const items = data.products
      .filter(p => p.status !== 'ARCHIVED' && p.totalInventory <= threshold && p.totalInventory >= 0)
      .sort((a, b) => a.totalInventory - b.totalInventory)
      .slice(0, 20)
      .map(p => ({
        id: p.id,
        title: p.title,
        image: p.image,
        stock: p.totalInventory,
        price: p.price,
      }))
    return NextResponse.json({ success: true, threshold, items })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message, items: [] }, { status: 200 })
  }
}
