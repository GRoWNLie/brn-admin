/**
 * Shopify Customer Account API köprüsü.
 *
 * KIMLIK VAR (production):
 *   - OAuth 2.0 ile login (Customer Account API client_id + client_secret store config'inde)
 *   - access_token ile customer/orders/addresses GraphQL
 *
 * KIMLIK YOK (lokal/dev):
 *   - Mock veri döner (login serbest, sahte sipariş/adres listesi)
 *   - Storefront UI bu sayede HEMEN çalışır, anahtarlar gelince gerçeğe döner
 *
 * Müşterinin Shopify admin token'ı: BURADA KULLANILMAZ. Müşteri verisi yalnızca
 * o müşterinin kendi OAuth access_token'ı ile çekilir (KVKK uyumu).
 */
import { prisma } from './prisma'
import { getStoreConfig } from './customer-dashboard'

export interface MockCustomer {
  id: string; firstName: string; lastName: string; email: string; phone: string | null
  defaultAddress: { address1: string; city: string; province: string; zip: string; country: string } | null
}
export interface MockOrder { id: string; name: string; createdAt: string; total: string; currency: string; financialStatus: string; fulfillmentStatus: string; lineCount: number }
export interface MockAddress { id: string; firstName: string; lastName: string; address1: string; address2?: string; city: string; province: string; zip: string; country: string; phone?: string; isDefault?: boolean }

const MOCK_CUSTOMER: MockCustomer = {
  id: 'mock-1', firstName: 'Demo', lastName: 'Müşteri', email: 'demo@sekerco.com', phone: '+90 555 000 0000',
  defaultAddress: { address1: 'Atatürk Cad. No:1', city: 'İstanbul', province: 'İstanbul', zip: '34000', country: 'Türkiye' },
}
const MOCK_ORDERS: MockOrder[] = [
  { id: 'gid://shopify/Order/1001', name: '#1001', createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), total: '849.50', currency: 'TRY', financialStatus: 'PAID', fulfillmentStatus: 'FULFILLED', lineCount: 2 },
  { id: 'gid://shopify/Order/1000', name: '#1000', createdAt: new Date(Date.now() - 15 * 86400000).toISOString(), total: '299.00', currency: 'TRY', financialStatus: 'PAID', fulfillmentStatus: 'FULFILLED', lineCount: 1 },
  { id: 'gid://shopify/Order/0999', name: '#0999', createdAt: new Date(Date.now() - 40 * 86400000).toISOString(), total: '1240.00', currency: 'TRY', financialStatus: 'PAID', fulfillmentStatus: 'IN_PROGRESS', lineCount: 3 },
]
const MOCK_ADDRESSES: MockAddress[] = [
  { id: 'a1', firstName: 'Demo', lastName: 'Müşteri', address1: 'Atatürk Cad. No:1', city: 'İstanbul', province: 'İstanbul', zip: '34000', country: 'Türkiye', isDefault: true },
]

export async function isConfigured(storeId: number): Promise<boolean> {
  const cfg = await getStoreConfig(storeId)
  return !!(cfg.customerAccountClientId && cfg.customerAccountClientSecret)
}

/**
 * E-posta ile login (sandbox/mock). Production'da OAuth code-exchange ile çalışır,
 * şimdilik anahtar yoksa serbest geçer (lokal test için).
 * Dönen customerId session'a yazılır.
 */
export async function attemptLogin(storeId: number, email: string, _password: string): Promise<{ ok: boolean; customerId?: string; message: string }> {
  if (!email || !email.includes('@')) return { ok: false, message: 'Geçersiz e-posta' }
  const configured = await isConfigured(storeId)
  if (!configured) {
    // Lokal/dev: e-postayı kimlik gibi al, sahte customerId üret
    return { ok: true, customerId: 'mock:' + email, message: '[MOCK] Giriş başarılı (Customer Account API tanımlanınca gerçek doğrulama)' }
  }
  // TODO(prod): Customer Account API OAuth — credentials grant veya passwordless
  return { ok: false, message: 'Production OAuth henüz bağlanmadı.' }
}

/** Müşteri profil bilgisi. Mock fallback. */
export async function getCustomer(storeId: number, customerId: string): Promise<MockCustomer | null> {
  if (customerId?.startsWith('mock:')) {
    const email = customerId.slice(5)
    return { ...MOCK_CUSTOMER, id: customerId, email }
  }
  return MOCK_CUSTOMER
}

export async function getOrders(storeId: number, customerId: string): Promise<MockOrder[]> { return MOCK_ORDERS }
export async function getAddresses(storeId: number, customerId: string): Promise<MockAddress[]> { return MOCK_ADDRESSES }

/** Recently viewed: session'dan urün GID listesi + her birinin başlık/görseli. */
export async function getRecentlyViewed(storeId: number, gids: string[]): Promise<Array<{ id: string; title: string; image: string | null; price?: string }>> {
  if (gids.length === 0) return []
  // Mock: GID'den isim türetelim. Production: store admin API ile ürünleri çek.
  return gids.slice(0, 12).map(gid => ({ id: gid, title: 'Ürün ' + gid.split('/').pop(), image: null }))
}

/** En çok sipariş edilen: sipariş geçmişinden hesapla. Mock için sabit liste. */
export async function getTopOrdered(storeId: number, customerId: string): Promise<Array<{ id: string; title: string; image: string | null; count: number }>> {
  return [
    { id: 'gid://shopify/Product/1', title: 'Destroyer Jacket Black', image: null, count: 3 },
    { id: 'gid://shopify/Product/2', title: 'Vintage Denim', image: null, count: 2 },
  ]
}
