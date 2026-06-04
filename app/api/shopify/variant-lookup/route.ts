import { NextRequest, NextResponse } from 'next/server'
import { findVariantsByCode } from '@/lib/shopify-inventory'

// GET /api/shopify/variant-lookup?code=BARKOD_VEYA_SKU
export async function GET(req: NextRequest) {
  const code = (req.nextUrl.searchParams.get('code') || '').trim()
  if (!code) {
    return NextResponse.json({ success: false, message: 'code gerekli', matches: [] }, { status: 400 })
  }
  try {
    const matches = await findVariantsByCode(code)
    return NextResponse.json({ success: true, matches })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message, matches: [] }, { status: 200 })
  }
}
