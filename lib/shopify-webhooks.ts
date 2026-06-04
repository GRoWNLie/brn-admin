/**
 * Shopify Webhook altyapısı:
 * - HMAC-SHA256 validation
 * - Topic → handler mapping
 * - Log + side effect (cache invalidate, prisma sync vs.)
 *
 * Custom App'lerde HMAC için "API_SECRET" kullanılır.
 */

import crypto from 'crypto'
import { prisma } from './prisma'
import { shopifyFetch } from './shopify'
import { createNotification, NotificationTemplates } from './notifications'
import { syncStockPriceToMarketplaces } from './marketplace-sync'
import { awardPoints } from './loyalty'

const API_SECRET = process.env.SHOPIFY_API_SECRET || ''

/**
 * Shopify her webhook isteğine `X-Shopify-Hmac-Sha256` header'ı koyar.
 * Doğrulama: HMAC-SHA256(rawBody, API_SECRET) base64 == header
 */
export function verifyWebhookHmac(rawBody: string, hmacHeader: string | null): boolean {
  if (!hmacHeader || !API_SECRET) return false
  const digest = crypto
    .createHmac('sha256', API_SECRET)
    .update(rawBody, 'utf8')
    .digest('base64')

  try {
    return crypto.timingSafeEqual(
      Buffer.from(digest),
      Buffer.from(hmacHeader)
    )
  } catch {
    return false
  }
}

/**
 * Webhook'u işle: log'a yaz + topic'e göre side effect tetikle.
 */
export async function processWebhook(
  topic: string,
  shopDomain: string,
  payload: Record<string, unknown>,
  hmacValid: boolean
): Promise<{ success: boolean; error?: string }> {
  const log = await prisma.webhookLog.create({
    data: {
      topic,
      shopDomain,
      payloadJson: payload as any,
      hmacValid,
      processed: false,
    },
  })

  try {
    // Topic bazlı handler
    switch (topic) {
      case 'orders/create': {
        const orderName = (payload as any).name || `#${payload.id}`
        const customer = (payload as any).customer
        const customerName = customer
          ? `${customer.first_name ?? ''} ${customer.last_name ?? ''}`.trim() || customer.email || 'Misafir'
          : 'Misafir'
        const total = `${(payload as any).total_price ?? '0'} ${(payload as any).currency ?? 'TRY'}`
        await createNotification(NotificationTemplates.newOrder(orderName, customerName, total))
        console.log(`📦 Webhook [${topic}] — Order ${orderName}`)
        break
      }
      case 'orders/paid': {
        const orderName = (payload as any).name || `#${payload.id}`
        const total = `${(payload as any).total_price ?? '0'} ${(payload as any).currency ?? 'TRY'}`
        await createNotification(NotificationTemplates.payment(orderName, total))
        // Sadakat puanı kazandır (müşteri varsa)
        const cust = (payload as any).customer
        if (cust?.id) {
          try {
            await awardPoints(String(cust.id), {
              orderTotal: parseFloat((payload as any).total_price ?? '0') || 0,
              orderId: String((payload as any).id),
              orderName,
              email: (payload as any).email ?? cust.email ?? null,
              name: `${cust.first_name ?? ''} ${cust.last_name ?? ''}`.trim() || null,
            })
          } catch (e) { console.error('Sadakat puanı hatası:', e) }
        }
        console.log(`💰 Webhook [${topic}] — ${orderName}`)
        break
      }
      case 'orders/updated':
      case 'orders/cancelled':
      case 'orders/fulfilled':
        console.log(`📦 Webhook [${topic}] — Order #${payload.id ?? '?'}`)
        break

      case 'products/create':
      case 'products/update':
      case 'products/delete': {
        // Stok uyarısı kontrol et — variant.inventory_quantity ≤ 3 ise bildirim
        const variants = (payload as any).variants ?? []
        for (const v of variants) {
          if (typeof v.inventory_quantity === 'number' && v.inventory_quantity > 0 && v.inventory_quantity <= 3) {
            await createNotification(NotificationTemplates.lowStock(
              (payload as any).title ?? 'Ürün',
              v.inventory_quantity
            ))
            break
          }
        }
        // Otomatik stok/fiyat senkronu — etkin pazaryerlerine bu ürünü it
        if (topic !== 'products/delete') {
          const skus = variants.map((v: any) => v.sku).filter(Boolean) as string[]
          if (skus.length > 0) {
            try {
              const r = await syncStockPriceToMarketplaces({ skus })
              if (r.synced > 0) console.log(`🔄 Pazaryeri senkron: ${skus.join(',')} → ${r.synced} pazaryeri`)
            } catch (e) {
              console.error('Pazaryeri senkron hatası:', e)
            }
          }
        }
        console.log(`🛍️ Webhook [${topic}] — Product #${payload.id ?? '?'}`)
        break
      }

      case 'customers/create':
      case 'customers/update':
        console.log(`👤 Webhook [${topic}] — Customer #${payload.id ?? '?'}`)
        break

      case 'app/uninstalled':
        // App kaldırıldı → tüm subscription'ları işaretsiz
        await prisma.webhookSubscription.updateMany({ data: { active: false } })
        console.log('⚠️ App uninstalled — webhook subscriptions disabled')
        break

      default:
        console.log(`📥 Webhook [${topic}] — handler yok`)
    }

    await prisma.webhookLog.update({
      where: { id: log.id },
      data: { processed: true },
    })
    return { success: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown'
    await prisma.webhookLog.update({
      where: { id: log.id },
      data: { errorMsg: msg },
    })
    return { success: false, error: msg }
  }
}

// =========================================================
//             SHOPIFY WEBHOOK YÖNETİMİ (GraphQL)
// =========================================================

const WEBHOOK_LIST_QUERY = /* GraphQL */ `
  query Webhooks {
    webhookSubscriptions(first: 100) {
      edges {
        node {
          id
          topic
          callbackUrl
          createdAt
        }
      }
    }
  }
`

const WEBHOOK_CREATE_MUTATION = /* GraphQL */ `
  mutation WebhookCreate($topic: WebhookSubscriptionTopic!, $url: URL!) {
    webhookSubscriptionCreate(
      topic: $topic,
      webhookSubscription: { callbackUrl: $url, format: JSON }
    ) {
      webhookSubscription { id topic callbackUrl }
      userErrors { field message }
    }
  }
`

const WEBHOOK_DELETE_MUTATION = /* GraphQL */ `
  mutation WebhookDelete($id: ID!) {
    webhookSubscriptionDelete(id: $id) {
      deletedWebhookSubscriptionId
      userErrors { field message }
    }
  }
`

export interface WebhookSub {
  id: string
  topic: string
  callbackUrl: string
  createdAt: string
}

export async function listWebhooks(): Promise<WebhookSub[]> {
  const data = await shopifyFetch<{
    webhookSubscriptions: { edges: Array<{ node: any }> }
  }>(WEBHOOK_LIST_QUERY)

  return data.webhookSubscriptions.edges.map(e => ({
    id: e.node.id,
    topic: e.node.topic,
    callbackUrl: e.node.callbackUrl,
    createdAt: e.node.createdAt,
  }))
}

export async function createWebhook(
  topic: string,
  callbackUrl: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const data = await shopifyFetch<{
      webhookSubscriptionCreate: {
        webhookSubscription: { id: string } | null
        userErrors: Array<{ field: string[] | null; message: string }>
      }
    }>(WEBHOOK_CREATE_MUTATION, {
      variables: { topic, url: callbackUrl },
    })
    const errs = data.webhookSubscriptionCreate.userErrors
    if (errs.length > 0) {
      return { success: false, error: errs.map(e => e.message).join('; ') }
    }
    const id = data.webhookSubscriptionCreate.webhookSubscription?.id
    if (id) {
      await prisma.webhookSubscription.upsert({
        where: { shopifyId: id },
        update: { topic, callbackUrl, active: true },
        create: { shopifyId: id, topic, callbackUrl },
      })
    }
    return { success: true, id }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'unknown' }
  }
}

export async function deleteWebhook(shopifyId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const data = await shopifyFetch<{
      webhookSubscriptionDelete: {
        deletedWebhookSubscriptionId: string | null
        userErrors: Array<{ field: string[] | null; message: string }>
      }
    }>(WEBHOOK_DELETE_MUTATION, { variables: { id: shopifyId } })
    const errs = data.webhookSubscriptionDelete.userErrors
    if (errs.length > 0) {
      return { success: false, error: errs.map(e => e.message).join('; ') }
    }
    await prisma.webhookSubscription.deleteMany({ where: { shopifyId } })
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'unknown' }
  }
}

/**
 * BRN Admin'in ihtiyaç duyduğu standart webhook topic'leri.
 * /settings/webhooks sayfası "Tümünü Kaydet" diyince hepsini Shopify'a kaydeder.
 */
export const REQUIRED_WEBHOOK_TOPICS = [
  'ORDERS_CREATE',
  'ORDERS_UPDATED',
  'ORDERS_PAID',
  'ORDERS_CANCELLED',
  'ORDERS_FULFILLED',
  'PRODUCTS_CREATE',
  'PRODUCTS_UPDATE',
  'PRODUCTS_DELETE',
  'CUSTOMERS_CREATE',
  'CUSTOMERS_UPDATE',
  'APP_UNINSTALLED',
] as const

// topic-string ↔ enum mapping
export function topicEnumToPath(topic: string): string {
  return topic.toLowerCase().replace(/_/g, '/')
}
export function topicPathToEnum(path: string): string {
  return path.toUpperCase().replace(/\//g, '_')
}
