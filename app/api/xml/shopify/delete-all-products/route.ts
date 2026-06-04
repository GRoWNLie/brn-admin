import { NextRequest, NextResponse } from 'next/server'
import { deleteAllShopifyProducts } from '@/lib/xml-engine/shopify'

// DELETE /api/xml/shopify/delete-all-products?shop=...
export async function DELETE(req: NextRequest) {
  const shop = req.nextUrl.searchParams.get('shop') || undefined
  console.log(`⚠️ DİKKAT: ${shop || 'default'} mağazasındaki tüm ürünleri silme isteği alındı!`)
  const result = await deleteAllShopifyProducts(shop)
  return NextResponse.json(result)
}
