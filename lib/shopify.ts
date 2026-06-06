/**
 * Merkezi Shopify Admin GraphQL Client
 * Tüm sayfalar bu client'ı kullanır.
 *
 * Özellikler:
 * - GraphQL üzerinden Admin API'ye bağlanır
 * - Token otomatik alınır (manuel SHOPIFY_ADMIN_ACCESS_TOKEN varsa onu, yoksa client_credentials ile OAuth)
 * - 401 alındığında token invalidate edilip yeniden alınır ve istek tekrarlanır
 * - Rate limit (THROTTLED) durumunda otomatik bekler ve tekrar dener
 * - Tip-güvenli sorgu/yanıt
 * - Hata yakalama + anlamlı mesajlar
 */

// NOT: Bu dosya yalnızca server-side (API routes, Server Components) kullanılmalıdır.
// Token tarayıcıya sızmamalı.

import { getShopifyAccessToken, invalidateToken } from './shopify-auth'
import { getSetting } from './app-settings'

// --- Tip tanımları ---

export interface ShopifyGraphQLError {
  message: string
  locations?: Array<{ line: number; column: number }>
  path?: string[]
  extensions?: Record<string, unknown>
}

export interface ShopifyGraphQLResponse<T> {
  data?: T
  errors?: ShopifyGraphQLError[]
  extensions?: {
    cost?: {
      requestedQueryCost: number
      actualQueryCost: number
      throttleStatus: {
        maximumAvailable: number
        currentlyAvailable: number
        restoreRate: number
      }
    }
  }
}

export class ShopifyClientError extends Error {
  constructor(message: string, public details?: unknown) {
    super(message)
    this.name = 'ShopifyClientError'
  }
}

interface ShopifyOptions {
  variables?: Record<string, unknown>
  /** Max kaç kez tekrar denesin (default 3) */
  maxRetries?: number
  /** Cache TTL (saniye). 0 = cache yok. Default: 0 (admin paneli için canlı veri) */
  cacheSeconds?: number
}

/**
 * Shopify Admin API'ye GraphQL sorgusu gönderir.
 *
 * @example
 *   const data = await shopifyFetch<{ shop: { name: string } }>(`{ shop { name } }`)
 */
export async function shopifyFetch<T = unknown>(
  query: string,
  options: ShopifyOptions = {}
): Promise<T> {
  // SHOPIFY_STORE_URL: başında "https://" veya "http://" varsa otomatik temizle,
  // sondaki slash ve path'leri de kaldır → sadece "xyz.myshopify.com" formatı.
  const rawStoreUrl = (await getSetting('SHOPIFY_STORE_URL')) || ''
  const STORE_URL = rawStoreUrl
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')
    .replace(/\/$/, '')
  const API_VERSION = (await getSetting('SHOPIFY_API_VERSION')) || '2024-01'
  const GRAPHQL_ENDPOINT = STORE_URL
    ? `https://${STORE_URL}/admin/api/${API_VERSION}/graphql.json`
    : ''
  if (!STORE_URL) {
    throw new ShopifyClientError('SHOPIFY_STORE_URL eksik.')
  }

  const { variables, maxRetries = 3, cacheSeconds = 0 } = options
  let attempt = 0
  let lastError: unknown = null
  let tokenRetriedAfter401 = false
  let bearerRetryUsed = false

  while (attempt <= maxRetries) {
    attempt++

    // Her denemede token'ı tazeden al (cache varsa onu döner)
    let token: string
    try {
      token = await getShopifyAccessToken()
    } catch (e) {
      throw new ShopifyClientError(
        e instanceof Error ? e.message : 'Token alınamadı'
      )
    }

    // Bazı yeni Shopify token formatları (örn. App Automation Token "atkn_")
    // X-Shopify-Access-Token yerine Authorization: Bearer header'ı bekler.
    // İlk denemede klasik header'ı kullan, 401 alınırsa Bearer ile yeniden dene.
    const useBearer = bearerRetryUsed
    const authHeaders: Record<string, string> = useBearer
      ? {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        }
      : {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': token,
          'Accept': 'application/json',
        }

    try {
      const res = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ query, variables }),
        next: cacheSeconds > 0 ? { revalidate: cacheSeconds } : { revalidate: 0 },
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')

        // 401: Token süresi dolmuş olabilir → invalidate + retry (sadece 1 kez)
        if (res.status === 401 && !tokenRetriedAfter401) {
          console.log('🔄 Shopify 401 — token yenileniyor...')
          invalidateToken()
          tokenRetriedAfter401 = true
          continue
        }

        // 401 ve manuel token aynı kalıyorsa → Bearer header ile bir defa daha dene
        if (res.status === 401 && !bearerRetryUsed) {
          console.log('🔄 Shopify 401 — Authorization: Bearer header ile yeniden deneniyor...')
          bearerRetryUsed = true
          continue
        }

        if (res.status === 401) {
          throw new ShopifyClientError(
            '401 Unauthorized — Token geçersiz veya yetkisiz. ' +
            'Kontrol listesi: (1) SHOPIFY_ADMIN_ACCESS_TOKEN doğru mu? ' +
            '(2) Public App mağazaya install edildi mi? ' +
            '(3) SHOPIFY_STORE_URL doğru mu (örn. xyz.myshopify.com — başında https:// OLMAMALI)? ' +
            '(4) Token tipinin scope\'ları mevcut işlem için yeterli mi?',
            { status: res.status, body: text.slice(0, 300) }
          )
        }
        if (res.status === 402) {
          throw new ShopifyClientError(
            '402 Payment Required — Shopify mağaza planı yetersiz.',
            { status: res.status }
          )
        }
        if (res.status === 403) {
          throw new ShopifyClientError(
            '403 Forbidden — Custom App scope ayarlarını kontrol edin (read_products, read_orders, read_customers).',
            { status: res.status, body: text }
          )
        }
        if (res.status === 404) {
          throw new ShopifyClientError(
            `404 Not Found — Mağaza URL'i (${STORE_URL}) veya API_VERSION (${API_VERSION}) hatalı.`,
            { status: res.status }
          )
        }
        if (res.status === 429) {
          const retryAfter = Number(res.headers.get('retry-after') || '2')
          await sleep(retryAfter * 1000)
          continue
        }
        throw new ShopifyClientError(
          `Shopify HTTP ${res.status}: ${text.slice(0, 200)}`,
          { status: res.status }
        )
      }

      const json = (await res.json()) as ShopifyGraphQLResponse<T>

      // GraphQL seviye hatalar
      if (json.errors && json.errors.length > 0) {
        const throttled = json.errors.find(
          e => e.extensions?.code === 'THROTTLED' ||
            /throttle/i.test(e.message)
        )
        if (throttled && attempt <= maxRetries) {
          const cost = json.extensions?.cost
          let waitMs = 1000
          if (cost) {
            const need = cost.requestedQueryCost
            const available = cost.throttleStatus.currentlyAvailable
            const restore = cost.throttleStatus.restoreRate || 50
            waitMs = Math.max(((need - available) / restore) * 1000, 500)
          }
          console.log(`⏳ Shopify THROTTLED — ${Math.round(waitMs)}ms bekleniyor`)
          await sleep(waitMs)
          continue
        }

        throw new ShopifyClientError(
          'GraphQL hatası: ' + json.errors.map(e => e.message).join('; '),
          json.errors
        )
      }

      if (!json.data) {
        throw new ShopifyClientError('Boş data döndü', json)
      }

      return json.data
    } catch (err) {
      lastError = err
      if (err instanceof ShopifyClientError) throw err
      if (attempt > maxRetries) break
      await sleep(500 * attempt)
    }
  }

  throw new ShopifyClientError(
    'Shopify isteği başarısız: ' + (lastError instanceof Error ? lastError.message : 'Bilinmeyen hata'),
    lastError
  )
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

// --- Yardımcı: Bağlantı sağlık kontrolü ---
export async function pingShopify(): Promise<{ ok: boolean; shopName?: string; error?: string }> {
  try {
    const data = await shopifyFetch<{ shop: { name: string; myshopifyDomain: string } }>(
      `query { shop { name myshopifyDomain } }`
    )
    return { ok: true, shopName: data.shop.name }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Bilinmeyen hata',
    }
  }
}
