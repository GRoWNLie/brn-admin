import { NextRequest, NextResponse } from 'next/server'
import { getCargoProvider, mockCargoStatus } from '@/lib/cargo'

/**
 * GET /api/cargo/track?provider=aras&number=1234567890
 *
 * Provider'ın hasApi=true ise gerçek API'ı dener.
 * API key yoksa veya provider entegrasyonu yoksa MOCK döner.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const providerId = sp.get('provider')
  const number = sp.get('number')

  if (!providerId || !number) {
    return NextResponse.json(
      { success: false, message: 'provider ve number gerekli' },
      { status: 400 }
    )
  }

  const provider = getCargoProvider(providerId)
  if (!provider) {
    return NextResponse.json(
      { success: false, message: `Bilinmeyen kargo firması: ${providerId}` },
      { status: 404 }
    )
  }

  // Gerçek API entegrasyonu varsa onu çağır, yoksa mock
  let statusInfo
  if (provider.getStatus) {
    try {
      statusInfo = await provider.getStatus(number)
    } catch (e) {
      statusInfo = mockCargoStatus(number)
    }
  } else {
    statusInfo = mockCargoStatus(number)
  }

  return NextResponse.json({
    success: true,
    provider: {
      id: provider.id,
      displayName: provider.displayName,
      logoEmoji: provider.logoEmoji,
      brandColor: provider.brandColor,
    },
    trackingNumber: number,
    trackingUrl: provider.getTrackingUrl(number),
    isMock: !provider.getStatus,
    ...statusInfo,
  })
}
