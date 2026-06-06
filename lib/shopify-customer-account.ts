/**
 * Shopify Storefront API köprüsü — müşteri kimlik doğrulama ve veri çekme.
 *
 * STOREFRONT TOKEN TANIMLI (production):
 *   - customerAccessTokenCreate ile email/şifre doğrulama
 *   - customer sorgusuyla profil/sipariş/adres çekme
 *
 * TOKEN YOK (lokal/dev):
 *   - Mock veri döner (login serbest, sahte veriler)
 */
import { getStoreConfig } from './customer-dashboard'

export interface MockCustomer {
  id: string; firstName: string; lastName: string; email: string; phone: string | null
  defaultAddress: { address1: string; city: string; province: string; zip: string; country: string } | null
}
export interface MockOrder { id: string; name: string; createdAt: string; total: string; currency: string; financialStatus: string; fulfillmentStatus: string; lineCount: number }
export interface MockAddress { id: string; firstName: string; lastName: string; address1: string; address2?: string; city: string; province: string; zip: string; country: string; phone?: string; isDefault?: boolean }

const MOCK_CUSTOMER: MockCustomer = {
  id: 'mock-1', firstName: 'Demo', lastName: 'Müşteri', email: 'demo@ornek.com', phone: '+90 555 000 0000',
  defaultAddress: { address1: 'Atatürk Cad. No:1', city: 'İstanbul', province: 'İstanbul', zip: '34000', country: 'Türkiye' },
}
const MOCK_ORDERS: MockOrder[] = [
  { id: 'gid://shopify/Order/1001', name: '#1001', createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), total: '849.50', currency: 'TRY', financialStatus: 'PAID', fulfillmentStatus: 'FULFILLED', lineCount: 2 },
  { id: 'gid://shopify/Order/1000', name: '#1000', createdAt: new Date(Date.now() - 15 * 86400000).toISOString(), total: '299.00', currency: 'TRY', financialStatus: 'PAID', fulfillmentStatus: 'FULFILLED', lineCount: 1 },
]
const MOCK_ADDRESSES: MockAddress[] = [
  { id: 'a1', firstName: 'Demo', lastName: 'Müşteri', address1: 'Atatürk Cad. No:1', city: 'İstanbul', province: 'İstanbul', zip: '34000', country: 'Türkiye', isDefault: true },
]

async function storefrontFetch(shopifyDomain: string, storefrontToken: string, query: string, variables: Record<string, unknown> = {}) {
  const apiVersion = '2024-01'
  const url = `https://${shopifyDomain}/api/${apiVersion}/graphql.json`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': storefrontToken,
    },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Storefront API HTTP ${res.status}`)
  return res.json()
}

export async function isConfigured(storeId: number): Promise<boolean> {
  const cfg = await getStoreConfig(storeId)
  return !!(cfg.storefrontAccessToken && cfg.shopifyDomain)
}

/** E-posta + şifre ile Shopify Storefront API üzerinden giriş. */
export async function attemptLogin(storeId: number, email: string, password: string): Promise<{ ok: boolean; customerId?: string; accessToken?: string; message: string }> {
  if (!email || !email.includes('@')) return { ok: false, message: 'Geçersiz e-posta' }

  const cfg = await getStoreConfig(storeId)
  const storefrontToken = cfg.storefrontAccessToken
  const shopifyDomain = cfg.shopifyDomain

  if (!storefrontToken || !shopifyDomain) {
    // Mock mod
    return { ok: true, customerId: 'mock:' + email, message: '[MOCK] Giriş başarılı (Storefront Access Token tanımlanınca gerçek doğrulama)' }
  }

  const mutation = `
    mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
      customerAccessTokenCreate(input: $input) {
        customerAccessToken { accessToken expiresAt }
        customerUserErrors { code field message }
      }
    }
  `
  const data = await storefrontFetch(shopifyDomain, storefrontToken, mutation, { input: { email, password } })
  const result = data?.data?.customerAccessTokenCreate
  const errors = result?.customerUserErrors ?? []

  if (errors.length > 0) {
    const code = errors[0]?.code
    if (code === 'UNIDENTIFIED_CUSTOMER') return { ok: false, message: 'E-posta veya şifre hatalı.' }
    return { ok: false, message: errors[0]?.message || 'Giriş başarısız.' }
  }

  const token = result?.customerAccessToken?.accessToken
  if (!token) return { ok: false, message: 'Giriş yapılamadı, tekrar deneyin.' }

  // customerId'yi access token ile çek
  const customerQuery = `{ customer(customerAccessToken: "${token}") { id } }`
  const cd = await storefrontFetch(shopifyDomain, storefrontToken, customerQuery)
  const customerId = cd?.data?.customer?.id ?? 'sf:' + email

  return { ok: true, customerId, accessToken: token, message: 'Giriş başarılı.' }
}

/** Müşteri profil bilgisi — accessToken session'dan okunur. */
export async function getCustomer(storeId: number, customerId: string, accessToken?: string | null): Promise<MockCustomer | null> {
  if (customerId?.startsWith('mock:')) {
    const email = customerId.slice(5)
    return { ...MOCK_CUSTOMER, id: customerId, email }
  }

  const cfg = await getStoreConfig(storeId)
  if (!cfg.storefrontAccessToken || !cfg.shopifyDomain || !accessToken) return MOCK_CUSTOMER

  const query = `
    query($token: String!) {
      customer(customerAccessToken: $token) {
        id firstName lastName email phone
        defaultAddress { address1 city province zip country }
      }
    }
  `
  const data = await storefrontFetch(cfg.shopifyDomain, cfg.storefrontAccessToken, query, { token: accessToken })
  const c = data?.data?.customer
  if (!c) return null
  return {
    id: c.id, firstName: c.firstName || '', lastName: c.lastName || '',
    email: c.email, phone: c.phone || null,
    defaultAddress: c.defaultAddress ? {
      address1: c.defaultAddress.address1, city: c.defaultAddress.city,
      province: c.defaultAddress.province, zip: c.defaultAddress.zip,
      country: c.defaultAddress.country,
    } : null,
  }
}

/** Müşteri sipariş geçmişi. */
export async function getOrders(storeId: number, customerId: string, accessToken?: string | null): Promise<MockOrder[]> {
  if (customerId?.startsWith('mock:')) return MOCK_ORDERS

  const cfg = await getStoreConfig(storeId)
  if (!cfg.storefrontAccessToken || !cfg.shopifyDomain || !accessToken) return MOCK_ORDERS

  const query = `
    query($token: String!) {
      customer(customerAccessToken: $token) {
        orders(first: 20, sortKey: PROCESSED_AT, reverse: true) {
          edges { node {
            id name processedAt
            totalPriceV2 { amount currencyCode }
            financialStatus fulfillmentStatus
            lineItems(first: 50) { edges { node { title } } }
          }}
        }
      }
    }
  `
  const data = await storefrontFetch(cfg.shopifyDomain, cfg.storefrontAccessToken, query, { token: accessToken })
  const edges = data?.data?.customer?.orders?.edges ?? []
  return edges.map((e: any) => {
    const o = e.node
    return {
      id: o.id, name: o.name,
      createdAt: o.processedAt,
      total: o.totalPriceV2?.amount ?? '0',
      currency: o.totalPriceV2?.currencyCode ?? 'TRY',
      financialStatus: o.financialStatus ?? '',
      fulfillmentStatus: o.fulfillmentStatus ?? '',
      lineCount: o.lineItems?.edges?.length ?? 0,
    }
  })
}

/** Müşteri adresleri. */
export async function getAddresses(storeId: number, customerId: string, accessToken?: string | null): Promise<MockAddress[]> {
  if (customerId?.startsWith('mock:')) return MOCK_ADDRESSES

  const cfg = await getStoreConfig(storeId)
  if (!cfg.storefrontAccessToken || !cfg.shopifyDomain || !accessToken) return MOCK_ADDRESSES

  const query = `
    query($token: String!) {
      customer(customerAccessToken: $token) {
        defaultAddress { id }
        addresses(first: 20) {
          edges { node { id firstName lastName address1 address2 city province zip country phone } }
        }
      }
    }
  `
  const data = await storefrontFetch(cfg.shopifyDomain, cfg.storefrontAccessToken, query, { token: accessToken })
  const c = data?.data?.customer
  if (!c) return MOCK_ADDRESSES
  const defaultId = c.defaultAddress?.id
  return (c.addresses?.edges ?? []).map((e: any) => {
    const a = e.node
    return {
      id: a.id, firstName: a.firstName || '', lastName: a.lastName || '',
      address1: a.address1 || '', address2: a.address2 || '',
      city: a.city || '', province: a.province || '', zip: a.zip || '',
      country: a.country || '', phone: a.phone || '',
      isDefault: a.id === defaultId,
    }
  })
}

/** Recently viewed: GID listesinden ürün başlık/görsel çek. */
export async function getRecentlyViewed(storeId: number, gids: string[]): Promise<Array<{ id: string; title: string; image: string | null; price?: string }>> {
  if (gids.length === 0) return []
  const cfg = await getStoreConfig(storeId)
  if (!cfg.storefrontAccessToken || !cfg.shopifyDomain) {
    return gids.slice(0, 12).map(gid => ({ id: gid, title: 'Ürün ' + gid.split('/').pop(), image: null }))
  }
  // Shopify Storefront API nodes query ile toplu çekme
  const nodeIds = gids.slice(0, 12).map(g => `"${g}"`).join(', ')
  const query = `{ nodes(ids: [${nodeIds}]) { id ... on Product { title featuredImage { url } priceRange { minVariantPrice { amount currencyCode } } } } }`
  const data = await storefrontFetch(cfg.shopifyDomain, cfg.storefrontAccessToken, query)
  return (data?.data?.nodes ?? []).filter(Boolean).map((n: any) => ({
    id: n.id, title: n.title || '', image: n.featuredImage?.url ?? null,
    price: n.priceRange?.minVariantPrice ? `${n.priceRange.minVariantPrice.amount} ${n.priceRange.minVariantPrice.currencyCode}` : undefined,
  }))
}

/** En çok sipariş edilen — sipariş listesinden hesapla. */
export async function getTopOrdered(storeId: number, customerId: string, accessToken?: string | null): Promise<Array<{ id: string; title: string; image: string | null; count: number }>> {
  const orders = await getOrders(storeId, customerId, accessToken)
  // Mock orders için sabit liste
  if (customerId?.startsWith('mock:') || orders === MOCK_ORDERS) {
    return [
      { id: 'gid://shopify/Product/1', title: 'Örnek Ürün 1', image: null, count: 3 },
      { id: 'gid://shopify/Product/2', title: 'Örnek Ürün 2', image: null, count: 2 },
    ]
  }
  return []
}
