/**
 * Storefront config için kısa süreli in-memory cache.
 * Multi-tenant: storeId bazlı, 60sn TTL.
 * Cache invalidation: store/theme/content/pages PATCH'lerinde çağrılır.
 */

interface CachedStore { data: any; expiresAt: number }
const cache = new Map<number, CachedStore>()
const TTL_MS = 60_000

export function getCachedStore(storeId: number): any | null {
  const c = cache.get(storeId)
  if (!c) return null
  if (Date.now() > c.expiresAt) { cache.delete(storeId); return null }
  return c.data
}
export function setCachedStore(storeId: number, data: any) {
  cache.set(storeId, { data, expiresAt: Date.now() + TTL_MS })
}
export function invalidateStoreCache(storeId: number) { cache.delete(storeId) }
export function clearAllStoreCache() { cache.clear() }
