import { NextResponse } from 'next/server'
import { blockInProduction } from '@/lib/debug-guard'
import { getShopifyAccessToken, getTokenInfo, invalidateToken } from '@/lib/shopify-auth'

/**
 * GET /api/shopify/get-token
 *   → Mevcut token (kısmen maskelenmiş) ve süresini gösterir
 *
 * GET /api/shopify/get-token?refresh=1
 *   → Cache'i invalidate edip yeni token alır
 *
 * Bu endpoint sadece DEBUG amaçlıdır. Production'da kaldırılmalı.
 */

function maskToken(token: string): string {
  if (token.length < 12) return token
  return token.slice(0, 10) + '••••••••' + token.slice(-4)
}

export async function GET(req: Request) {
  const blocked = blockInProduction(); if (blocked) return blocked
  const url = new URL(req.url)
  const refresh = url.searchParams.get('refresh') === '1'

  if (refresh) invalidateToken()

  try {
    const token = await getShopifyAccessToken()
    const info = getTokenInfo()
    return NextResponse.json({
      success: true,
      token: maskToken(token),
      source: info.source,
      expiresInSeconds: info.expiresIn,
      hint: info.source === 'manual'
        ? 'Manuel SHOPIFY_ADMIN_ACCESS_TOKEN kullanılıyor (Custom App permanent token).'
        : 'client_credentials grant ile OAuth token alındı.',
    })
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        message: e instanceof Error ? e.message : 'Token alınamadı',
        hint: 'API_KEY ve API_SECRET .env\'de doğru mu? Mağaza URL\'i doğru mu? Custom App install edilmiş mi?',
      },
      { status: 500 }
    )
  }
}
