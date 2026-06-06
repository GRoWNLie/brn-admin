/**
 * Shopify Public App OAuth — Install Başlatıcı
 *
 * Mevcut Public App (BRN Admin)'i mağazaya install eder.
 * Sonuçta Shopify, callback'e shpat_ formatında permanent token verir.
 *
 * Kullanım:
 *   /api/shopify/install
 *   /api/shopify/install?shop=xyc2un-pk.myshopify.com
 *
 * Akış:
 *   1) shop parametresi yoksa SHOPIFY_STORE_URL'den oku
 *   2) Random nonce üret, cookie'ye yaz (CSRF için)
 *   3) Kullanıcıyı Shopify oauth/authorize sayfasına yönlendir
 *   4) Mağaza sahibi onaylar → callback'e döner (code + shop + hmac + state)
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSetting } from '@/lib/app-settings'

export const dynamic = 'force-dynamic'

// Custom App scope'larıyla birebir aynı — değiştirilirse Public App config'i de güncellenmeli
const SCOPES = [
  'read_products', 'write_products',
  'read_orders', 'write_orders',
  'read_customers', 'write_customers',
  'read_inventory', 'write_inventory',
  'read_locations',
  'read_discounts', 'write_discounts',
  'read_draft_orders', 'write_draft_orders',
  'read_gift_cards',
].join(',')

function normalizeShop(input: string): string {
  return input.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '').replace(/\/$/, '')
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const rawShop = sp.get('shop') || (await getSetting('SHOPIFY_STORE_URL'))
  const shop = normalizeShop(rawShop)

  if (!shop || !/\.myshopify\.com$/i.test(shop)) {
    return NextResponse.json(
      {
        success: false,
        message: 'Geçerli bir mağaza belirtilmedi. ?shop=xyz.myshopify.com gönder veya SHOPIFY_STORE_URL ayarla.',
        received: shop,
      },
      { status: 400 }
    )
  }

  const apiKey = await getSetting('SHOPIFY_API_KEY')
  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        message: 'SHOPIFY_API_KEY tanımlı değil. Public App\'in Client ID/API Key değerini Railway → Variables\'a ekle.',
      },
      { status: 500 }
    )
  }

  // CSRF nonce
  const nonce = crypto.randomBytes(16).toString('hex')

  // Public origin (Railway domain veya custom domain)
  const origin = process.env.NEXTAUTH_URL
    || `${req.nextUrl.protocol}//${req.headers.get('host') || req.nextUrl.host}`
  const redirectUri = `${origin.replace(/\/$/, '')}/api/shopify/oauth/callback`

  // Shopify authorize URL
  const authorize = new URL(`https://${shop}/admin/oauth/authorize`)
  authorize.searchParams.set('client_id', apiKey)
  authorize.searchParams.set('scope', SCOPES)
  authorize.searchParams.set('redirect_uri', redirectUri)
  authorize.searchParams.set('state', nonce)
  // grant_options[]=per-user satırını koymadık → offline token (permanent shpat_)

  const res = NextResponse.redirect(authorize.toString(), { status: 302 })

  // CSRF cookie (10 dk)
  res.cookies.set('shopify_oauth_state', nonce, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  })
  res.cookies.set('shopify_oauth_shop', shop, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  })

  return res
}
