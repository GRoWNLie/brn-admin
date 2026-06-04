import { NextRequest, NextResponse } from 'next/server'
import { getAllLocations, getVariantInventoryByLocation } from '@/lib/shopify-inventory'
import { setInventoryQuantity } from '@/lib/shopify-mutations'

// GET /api/shopify/inventory?variantId=...
export async function GET(req: NextRequest) {
  const variantId = req.nextUrl.searchParams.get('variantId')
  if (!variantId) {
    // Lokasyon listesi
    try {
      const locations = await getAllLocations()
      return NextResponse.json({ success: true, locations })
    } catch (e: any) {
      return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
    }
  }

  try {
    const result = await getVariantInventoryByLocation(decodeURIComponent(variantId))
    return NextResponse.json({ success: true, ...result })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}

// POST /api/shopify/inventory
// Body: { inventoryItemId, locationId, quantity }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  if (!body.inventoryItemId || !body.locationId || typeof body.quantity !== 'number') {
    return NextResponse.json(
      { success: false, message: 'inventoryItemId, locationId, quantity gerekli' },
      { status: 400 }
    )
  }
  const result = await setInventoryQuantity(body.inventoryItemId, body.locationId, body.quantity)
  return NextResponse.json(result)
}
