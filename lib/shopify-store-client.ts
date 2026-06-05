/**
 * Multi-tenant Shopify Admin API client.
 * StoreConfig içindeki adminToken + Store.shopifyDomain ile o mağazaya çağrı yapar.
 * Tek-tenant lib/shopify.ts global .env kullanır; bu ise store başına çalışır.
 */
import { prisma } from './prisma'
import { getStoreConfig } from './customer-dashboard'

const DEFAULT_API_VERSION = '2024-10'

export interface StoreShopifyError extends Error { status?: number }

export async function storeShopifyFetch<T = any>(
  storeId: number, query: string, variables?: Record<string, unknown>,
): Promise<T> {
  const store = await prisma.store.findUnique({ where: { id: storeId } })
  if (!store) throw new Error('Mağaza bulunamadı')
  const cfg = await getStoreConfig(storeId)
  if (!cfg.adminToken) {
    const e: StoreShopifyError = new Error('Bu mağaza için Shopify Admin Token tanımlı değil')
    throw e
  }
  const version = cfg.apiVersion || DEFAULT_API_VERSION
  const endpoint = `https://${store.shopifyDomain}/admin/api/${version}/graphql.json`
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': cfg.adminToken,
      'Accept': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  })
  const text = await res.text()
  if (!res.ok) {
    const e: StoreShopifyError = new Error(`Shopify ${res.status}: ${text.slice(0, 200)}`)
    e.status = res.status
    throw e
  }
  const json = JSON.parse(text)
  if (json.errors?.length) throw new Error('GraphQL: ' + json.errors.map((x: any) => x.message).join('; '))
  return json.data as T
}

const CUSTOMER_CREATE = /* GraphQL */ `
  mutation customerCreate($input: CustomerInput!) {
    customerCreate(input: $input) {
      customer { id email firstName lastName phone acceptsMarketing }
      userErrors { field message }
    }
  }
`

export interface CreateCustomerInput {
  firstName: string; lastName: string; email: string; phone?: string | null
  password?: string; acceptsMarketing?: boolean; smsMarketing?: boolean
  note?: string; tags?: string[]
}

export interface CreatedCustomer {
  id: string; email: string; firstName: string | null; lastName: string | null
  phone: string | null; acceptsMarketing: boolean
}

export async function createShopifyCustomer(
  storeId: number, input: CreateCustomerInput,
): Promise<{ ok: boolean; customer?: CreatedCustomer; message: string; alreadyExists?: boolean }> {
  try {
    const data = await storeShopifyFetch<{ customerCreate: { customer: any; userErrors: any[] } }>(
      storeId, CUSTOMER_CREATE,
      {
        input: {
          firstName: input.firstName, lastName: input.lastName, email: input.email,
          phone: input.phone || null,
          emailMarketingConsent: input.acceptsMarketing ? { marketingState: 'SUBSCRIBED', marketingOptInLevel: 'SINGLE_OPT_IN' } : undefined,
          smsMarketingConsent: input.smsMarketing && input.phone ? { marketingState: 'SUBSCRIBED', marketingOptInLevel: 'SINGLE_OPT_IN', consentCollectedFrom: 'SHOPIFY' } : undefined,
          tags: input.tags,
          note: input.note,
        },
      },
    )
    const errs = data.customerCreate.userErrors || []
    if (errs.length) {
      const dup = errs.find(e => /already taken|exists/i.test(e.message))
      if (dup) return { ok: false, alreadyExists: true, message: 'Bu e-posta zaten kayıtlı. Giriş yapmayı dene.' }
      return { ok: false, message: errs.map(e => e.message).join('; ') }
    }
    const c = data.customerCreate.customer
    return { ok: true, customer: c, message: 'Müşteri oluşturuldu' }
  } catch (e: any) {
    // Mağaza henüz Shopify'a bağlı değilse mock dön (lokal test için)
    if (/Admin Token tanımlı değil/.test(e?.message || '')) {
      return {
        ok: true,
        customer: {
          id: 'mock://customer/' + Date.now(),
          email: input.email, firstName: input.firstName, lastName: input.lastName,
          phone: input.phone || null, acceptsMarketing: !!input.acceptsMarketing,
        },
        message: '[MOCK] Müşteri lokal kaydedildi (mağaza Shopify Admin Token girilince gerçek müşteri oluşacak).',
      }
    }
    return { ok: false, message: e?.message || 'Müşteri oluşturulamadı' }
  }
}
