/**
 * Customer Dashboard servis katmanı — multi-tenant mağaza/tema/içerik yönetimi.
 * Hassas alanlar (admin token, app proxy secret, customer account API client) AES ile şifreli.
 */
import { prisma } from './prisma'
import { encryptJson, decryptJson } from './efatura/crypto'

export interface StoreConfig {
  adminToken?: string
  apiKey?: string
  apiSecret?: string
  proxySecret?: string                  // App Proxy shared secret (Shopify Admin → App Proxy)
  customerAccountClientId?: string
  customerAccountClientSecret?: string
  storefrontAccessToken?: string   
  apiVersion?: string
}

export const PAGE_KEYS = ['login', 'register', 'reset', 'account', 'orders', 'addresses', 'recent', 'top'] as const
export type PageKey = (typeof PAGE_KEYS)[number]

export const PAGE_LABELS: Record<PageKey, string> = {
  login: 'Giriş',
  register: 'Kayıt',
  reset: 'Şifre Sıfırlama',
  account: 'Profil / Hesabım',
  orders: 'Siparişlerim',
  addresses: 'Adreslerim',
  recent: 'Son Görüntülenenler',
  top: 'En Çok Sipariş Edilenler',
}

const DEFAULT_TABS = { profile: true, orders: true, addresses: true, recent: true, top: true }

/** Yeni mağaza için varsayılan tema + içerik + sayfa kayıtları. */
export async function createStore(input: {
  slug: string; name: string; shopifyDomain: string; customDomain?: string | null
  config?: StoreConfig
}) {
  const slug = input.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-')
  const store = await prisma.store.create({
    data: {
      slug, name: input.name, shopifyDomain: input.shopifyDomain,
      customDomain: input.customDomain || null,
      config: input.config ? encryptJson(input.config) : null,
      status: 'setup',
      theme: { create: {} },
      content: { create: { visibleTabs: JSON.stringify(DEFAULT_TABS) } },
      pages: {
        create: PAGE_KEYS.map(k => ({ pageKey: k, enabled: true, title: PAGE_LABELS[k] })),
      },
    },
    include: { theme: true, content: true, pages: true },
  })
  return store
}

export async function updateStoreConfig(storeId: number, patch: Partial<StoreConfig>) {
  const store = await prisma.store.findUnique({ where: { id: storeId } })
  if (!store) throw new Error('Mağaza bulunamadı')
  const current: StoreConfig = (decryptJson<StoreConfig>(store.config) ?? {}) as StoreConfig
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined && v !== '') (current as any)[k] = v
  }
  return prisma.store.update({ where: { id: storeId }, data: { config: encryptJson(current) } })
}

export async function getStoreConfig(storeId: number): Promise<StoreConfig> {
  const s = await prisma.store.findUnique({ where: { id: storeId } })
  return (decryptJson<StoreConfig>(s?.config ?? null) ?? {}) as StoreConfig
}

/** UI'ya gönderim için: secret alanlar maskelenir, dolu olup olmadıkları görünür. */
export function maskStore(store: any) {
  const cfg: StoreConfig = (decryptJson<StoreConfig>(store.config) ?? {}) as StoreConfig
  return {
    id: store.id, slug: store.slug, name: store.name,
    shopifyDomain: store.shopifyDomain, customDomain: store.customDomain,
    status: store.status, createdAt: store.createdAt, updatedAt: store.updatedAt,
    configFields: {
      hasAdminToken: !!cfg.adminToken,
      hasApiKey: !!cfg.apiKey,
      hasApiSecret: !!cfg.apiSecret,
      hasProxySecret: !!cfg.proxySecret,
      hasCustomerAccount: !!(cfg.customerAccountClientId && cfg.customerAccountClientSecret),
      apiVersion: cfg.apiVersion || null,
    },
  }
}

export async function findStoreBySlugOrDomain(idOrSlugOrDomain: string) {
  const id = Number(idOrSlugOrDomain)
  if (!isNaN(id)) return prisma.store.findUnique({ where: { id }, include: { theme: true, content: true, pages: true } })
  return prisma.store.findFirst({
    where: { OR: [{ slug: idOrSlugOrDomain }, { shopifyDomain: idOrSlugOrDomain }, { customDomain: idOrSlugOrDomain }] },
    include: { theme: true, content: true, pages: true },
  })
}
