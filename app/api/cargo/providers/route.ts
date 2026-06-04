import { NextResponse } from 'next/server'
import { PROVIDERS } from '@/lib/cargo'

/**
 * GET /api/cargo/providers
 * Tüm kargo firmalarının listesi (UI dropdown için)
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    providers: PROVIDERS.map(p => ({
      id: p.id,
      displayName: p.displayName,
      logoEmoji: p.logoEmoji,
      supportPhone: p.supportPhone,
      brandColor: p.brandColor,
      shopifyTrackingCompany: p.shopifyTrackingCompany,
      hasApi: p.hasApi,
    })),
  })
}
