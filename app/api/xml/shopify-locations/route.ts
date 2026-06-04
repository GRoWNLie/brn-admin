import { NextRequest, NextResponse } from 'next/server'
import { getShopifyLocations } from '@/lib/xml-engine/shopify'

// GET /api/xml/shopify-locations?shop=...
export async function GET(req: NextRequest) {
  const shop = req.nextUrl.searchParams.get('shop') || undefined
  try {
    const locations = await getShopifyLocations(shop)
    return NextResponse.json({ success: true, locations })
  } catch {
    return NextResponse.json({
      success: false,
      locations: [{ id: '1', name: 'Ana Depo (Ümraniye)' }],
    })
  }
}
