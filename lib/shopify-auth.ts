/**
 * Shopify OAuth token yönetimi.
 *
 * SHOPIFY_ADMIN_ACCESS_TOKEN doluysa onu kullanır (Custom App permanent token).
 * Boşsa veya 401 hatası alınırsa client_credentials grant ile OAuth token alır.
 *
 * Token cache'lenir, expires_in dolmadan önce yeniden kullanılır.
 */

import { getSetting } from './app-settings'

interface CachedToken {
  token: string
  expiresAt: number  // Unix ms
  source: 'manual' | 'oauth'
}

let cached: CachedToken | null = null

/**
 * Manuel token varsa onu, yoksa OAuth ile alınanı döndürür.
 * 401 alındığında `invalidateToken()` çağrılırsa bir sonraki istek
 * client_credentials ile yenileme yapar.
 */
export async function getShopifyAccessToken(): Promise<string> {
  // 1) Cache geçerli mi?
  if (cached && Date.now() < cached.expiresAt - 60_000) {
    return cached.token
  }

  // 2) Manuel token varsa onu kullan (Custom App permanent token, expire olmaz)
  const MANUAL_TOKEN = await getSetting('SHOPIFY_ADMIN_ACCESS_TOKEN')
  if (MANUAL_TOKEN && MANUAL_TOKEN.startsWith('shpat_')) {
    cached = {
      token: MANUAL_TOKEN,
      // Manuel token expire olmaz — 24 saat sonra revalidate
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      source: 'manual',
    }
    return cached.token
  }

  // 3) OAuth ile dinamik token al
  return await fetchOAuthToken()
}

async function fetchOAuthToken(): Promise<string> {
  const STORE_URL = await getSetting('SHOPIFY_STORE_URL')
  const API_KEY = await getSetting('SHOPIFY_API_KEY')
  const API_SECRET = await getSetting('SHOPIFY_API_SECRET')
  if (!STORE_URL || !API_KEY || !API_SECRET) {
    throw new Error(
      'Shopify credentials eksik. .env içine SHOPIFY_STORE_URL, SHOPIFY_API_KEY, SHOPIFY_API_SECRET ekleyin.'
    )
  }

  const url = `https://${STORE_URL}/admin/oauth/access_token`
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: API_KEY,
    client_secret: API_SECRET,
  })

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(
      `OAuth token alınamadı (HTTP ${res.status}). Client ID/Secret veya mağaza URL'ini kontrol edin. Yanıt: ${text.slice(0, 200)}`
    )
  }

  const data = (await res.json()) as {
    access_token: string
    scope: string
    expires_in?: number
  }

  if (!data.access_token) {
    throw new Error('OAuth yanıtı access_token içermiyor')
  }

  cached = {
    token: data.access_token,
    // expires_in saniye cinsindendir; yoksa 23 saat varsay
    expiresAt: Date.now() + (data.expires_in ?? 23 * 3600) * 1000,
    source: 'oauth',
  }

  console.log(`✅ Shopify OAuth token alındı. Scope: ${data.scope}. Süre: ${data.expires_in ?? '?'}sn`)
  return cached.token
}

/**
 * Token'ı invalidate et. 401 alındığında çağrılır.
 * Bir sonraki istek yeni token alır.
 */
export function invalidateToken(): void {
  cached = null
}

/**
 * Debug için cache durumunu döner.
 */
export function getTokenInfo(): { hasToken: boolean; source?: string; expiresIn?: number } {
  if (!cached) return { hasToken: false }
  return {
    hasToken: true,
    source: cached.source,
    expiresIn: Math.round((cached.expiresAt - Date.now()) / 1000),
  }
}
