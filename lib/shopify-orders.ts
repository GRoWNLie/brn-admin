/**
 * Sipariş detay, fulfillment, refund operasyonları.
 */
import { shopifyFetch } from './shopify'

export interface OrderDetail {
  id: string
  name: string
  createdAt: string
  email: string | null
  phone: string | null
  note: string | null
  tags: string[]
  displayFinancialStatus: string | null
  displayFulfillmentStatus: string | null
  customer: {
    id: string
    displayName: string
    email: string | null
    phone: string | null
  } | null
  shippingAddress: {
    address1: string | null
    address2: string | null
    city: string | null
    province: string | null
    zip: string | null
    country: string | null
    phone: string | null
    name: string | null
  } | null
  totalPrice: string
  totalShipping: string
  totalTax: string
  totalDiscounts: string
  totalRefunded: string
  currency: string
  lineItems: Array<{
    id: string
    title: string
    quantity: number
    sku: string | null
    image: string | null
    unitPrice: string
    totalDiscount: string
    fulfillableQuantity: number
  }>
  fulfillments: Array<{
    id: string
    status: string
    createdAt: string
    trackingInfo: Array<{ company: string | null; number: string | null; url: string | null }>
  }>
  fulfillmentOrders: Array<{
    id: string
    status: string
    assignedLocation: { name: string } | null
    lineItems: Array<{
      id: string
      remainingQuantity: number
      lineItem: { id: string; title: string; sku: string | null }
    }>
  }>
  refunds: Array<{
    id: string
    createdAt: string
    totalRefunded: string
    note: string | null
  }>
}

const ORDER_DETAIL_QUERY = /* GraphQL */ `
  query OrderDetail($id: ID!) {
    order(id: $id) {
      id
      name
      createdAt
      email
      phone
      note
      tags
      displayFinancialStatus
      displayFulfillmentStatus
      currencyCode
      customer { id displayName email phone }
      shippingAddress {
        address1 address2 city province zip country phone name
      }
      currentTotalPriceSet { shopMoney { amount currencyCode } }
      totalShippingPriceSet { shopMoney { amount } }
      currentTotalTaxSet { shopMoney { amount } }
      currentTotalDiscountsSet { shopMoney { amount } }
      totalRefundedSet { shopMoney { amount } }
      lineItems(first: 50) {
        edges {
          node {
            id
            title
            quantity
            sku
            image { url }
            originalUnitPriceSet { shopMoney { amount } }
            totalDiscountSet { shopMoney { amount } }
            fulfillableQuantity
          }
        }
      }
      fulfillments(first: 20) {
        id
        status
        createdAt
        trackingInfo { company number url }
      }
      refunds(first: 20) {
        id
        createdAt
        totalRefundedSet { shopMoney { amount } }
        note
      }
    }
  }
`

// fulfillmentOrders için ayrı (opsiyonel) query — scope yoksa boş dönecek
const FULFILLMENT_ORDERS_QUERY = /* GraphQL */ `
  query OrderFulfillmentOrders($id: ID!) {
    order(id: $id) {
      fulfillmentOrders(first: 20) {
        edges {
          node {
            id
            status
            assignedLocation { name }
            lineItems(first: 50) {
              edges {
                node {
                  id
                  remainingQuantity
                  lineItem { id title sku }
                }
              }
            }
          }
        }
      }
    }
  }
`

async function tryGetFulfillmentOrders(id: string): Promise<any[]> {
  try {
    const data = await shopifyFetch<{ order: any }>(FULFILLMENT_ORDERS_QUERY, {
      variables: { id },
    })
    return data.order?.fulfillmentOrders?.edges?.map((e: any) => ({
      id: e.node.id,
      status: e.node.status,
      assignedLocation: e.node.assignedLocation,
      lineItems: e.node.lineItems.edges.map((li: any) => li.node),
    })) ?? []
  } catch (err: any) {
    // Scope eksikse sessizce boş dön — fulfill butonu görünmeyecek ama detay açılacak
    if (/Access denied|scope|read_assigned_fulfillment_orders|read_merchant_managed_fulfillment_orders/i.test(err?.message ?? '')) {
      console.warn('⚠️ fulfillmentOrders scope yok — kargo başlatma kapalı:', err.message)
      return []
    }
    throw err
  }
}

export async function getOrderDetail(id: string): Promise<OrderDetail | null> {
  // Ana detay her zaman alınır
  const data = await shopifyFetch<{ order: any }>(ORDER_DETAIL_QUERY, {
    variables: { id },
  })
  const o = data.order
  if (!o) return null

  // fulfillmentOrders ayrı query — scope yoksa boş döner
  const fulfillmentOrders = await tryGetFulfillmentOrders(id)

  return {
    id: o.id,
    name: o.name,
    createdAt: o.createdAt,
    email: o.email,
    phone: o.phone,
    note: o.note,
    tags: o.tags || [],
    displayFinancialStatus: o.displayFinancialStatus,
    displayFulfillmentStatus: o.displayFulfillmentStatus,
    customer: o.customer,
    shippingAddress: o.shippingAddress,
    totalPrice: o.currentTotalPriceSet?.shopMoney.amount ?? '0',
    totalShipping: o.totalShippingPriceSet?.shopMoney.amount ?? '0',
    totalTax: o.currentTotalTaxSet?.shopMoney.amount ?? '0',
    totalDiscounts: o.currentTotalDiscountsSet?.shopMoney.amount ?? '0',
    totalRefunded: o.totalRefundedSet?.shopMoney.amount ?? '0',
    currency: o.currencyCode || 'TRY',
    lineItems: o.lineItems.edges.map((e: any) => ({
      id: e.node.id,
      title: e.node.title,
      quantity: e.node.quantity,
      sku: e.node.sku,
      image: e.node.image?.url ?? null,
      unitPrice: e.node.originalUnitPriceSet?.shopMoney.amount ?? '0',
      totalDiscount: e.node.totalDiscountSet?.shopMoney.amount ?? '0',
      fulfillableQuantity: e.node.fulfillableQuantity ?? 0,
    })),
    fulfillments: (o.fulfillments || []).map((f: any) => ({
      id: f.id,
      status: f.status,
      createdAt: f.createdAt,
      trackingInfo: f.trackingInfo || [],
    })),
    fulfillmentOrders,
    refunds: (o.refunds || []).map((r: any) => ({
      id: r.id,
      createdAt: r.createdAt,
      totalRefunded: r.totalRefundedSet?.shopMoney.amount ?? '0',
      note: r.note,
    })),
  }
}

// =========================================================
//                     FULFILLMENT
// =========================================================

const FULFILLMENT_CREATE_MUTATION = /* GraphQL */ `
  mutation FulfillmentCreate($fulfillment: FulfillmentV2Input!) {
    fulfillmentCreateV2(fulfillment: $fulfillment) {
      fulfillment { id status trackingInfo { company number url } }
      userErrors { field message }
    }
  }
`

export interface CreateFulfillmentInput {
  fulfillmentOrderId: string
  trackingCompany?: string
  trackingNumber?: string
  trackingUrl?: string
  notifyCustomer?: boolean
}

export async function createFulfillment(input: CreateFulfillmentInput): Promise<{
  success: boolean
  fulfillmentId?: string
  errors: Array<{ field: string[] | null; message: string }>
}> {
  const variables = {
    fulfillment: {
      lineItemsByFulfillmentOrder: [{ fulfillmentOrderId: input.fulfillmentOrderId }],
      notifyCustomer: input.notifyCustomer ?? true,
      trackingInfo: {
        company: input.trackingCompany,
        number: input.trackingNumber,
        url: input.trackingUrl,
      },
    },
  }

  const data = await shopifyFetch<{
    fulfillmentCreateV2: {
      fulfillment: { id: string } | null
      userErrors: Array<{ field: string[] | null; message: string }>
    }
  }>(FULFILLMENT_CREATE_MUTATION, { variables })

  const errs = data.fulfillmentCreateV2.userErrors
  return {
    success: errs.length === 0,
    fulfillmentId: data.fulfillmentCreateV2.fulfillment?.id,
    errors: errs,
  }
}

// =========================================================
//                     REFUND
// =========================================================

const REFUND_CALCULATE_QUERY = /* GraphQL */ `
  query RefundCalc($input: RefundInput!) {
    refundCalculate(input: $input) {
      refund {
        amountSet { shopMoney { amount currencyCode } }
      }
    }
  }
`

const REFUND_CREATE_MUTATION = /* GraphQL */ `
  mutation RefundCreate($input: RefundInput!) {
    refundCreate(input: $input) {
      refund { id }
      userErrors { field message }
    }
  }
`

/**
 * Siparişteki ödeme transaction'larını çeker — refund için "parentTransactionId" lazım.
 */
const ORDER_TRANSACTIONS_QUERY = /* GraphQL */ `
  query OrderTxs($id: ID!) {
    order(id: $id) {
      transactions(first: 20) {
        id
        kind
        status
        gateway
        amountSet { shopMoney { amount currencyCode } }
      }
    }
  }
`

export interface CreateRefundInput {
  orderId: string
  amount: string         // ör. "150.00"
  currency: string       // ör. "TRY"
  note?: string
  notify?: boolean
  refundLineItems?: Array<{
    lineItemId: string
    quantity: number
  }>
}

export async function createRefund(input: CreateRefundInput): Promise<{
  success: boolean
  refundId?: string
  errors: Array<{ field: string[] | null; message: string }>
}> {
  // Refund için Shopify "refundLineItems" VEYA "transactions" istiyor.
  // Eğer line items varsa onunla, yoksa son SALE/CAPTURE transaction'ı bulup
  // transactions[] olarak iletiyoruz.

  const refundInput: Record<string, unknown> = {
    orderId: input.orderId,
    note: input.note || '',
    notify: input.notify ?? false,
  }

  const hasLineItems = input.refundLineItems && input.refundLineItems.length > 0
  if (hasLineItems) {
    refundInput.refundLineItems = input.refundLineItems!.map(li => ({
      lineItemId: li.lineItemId,
      quantity: li.quantity,
      restockType: 'NO_RESTOCK',
    }))
  }

  // Transactions ekle (her zaman tavsiye edilir — para iade kaynağını belirler)
  try {
    const txData = await shopifyFetch<{
      order: { transactions: any[] } | null
    }>(ORDER_TRANSACTIONS_QUERY, { variables: { id: input.orderId } })

    const txs = txData.order?.transactions ?? []
    // Para çekilen SALE veya CAPTURE transaction'larını bul
    const paidTxs = txs.filter((t: any) =>
      (t.kind === 'SALE' || t.kind === 'CAPTURE') && t.status === 'SUCCESS'
    )

    if (paidTxs.length > 0) {
      const amountToRefund = parseFloat(input.amount)
      // Tek parental ile yet
      refundInput.transactions = [{
        orderId: input.orderId,
        parentId: paidTxs[0].id,
        amount: amountToRefund.toFixed(2),
        gateway: paidTxs[0].gateway || 'manual',
        kind: 'REFUND',
      }]
    }
  } catch (e) {
    // Transactions çekilemediyse devam et — kalem varsa yine çalışır
    console.warn('Refund transactions fetch failed:', e)
  }

  // Hem refundLineItems hem transactions yoksa hata olacak — uyar
  if (!hasLineItems && !refundInput.transactions) {
    return {
      success: false,
      errors: [{
        field: null,
        message: 'İade için en az 1 ürün seçmelisin veya siparişin başarılı bir ödeme transaction\'ı olmalı.',
      }],
    }
  }

  try {
    const data = await shopifyFetch<{
      refundCreate: {
        refund: { id: string } | null
        userErrors: Array<{ field: string[] | null; message: string }>
      }
    }>(REFUND_CREATE_MUTATION, { variables: { input: refundInput } })

    const errs = data.refundCreate.userErrors
    return {
      success: errs.length === 0,
      refundId: data.refundCreate.refund?.id,
      errors: errs,
    }
  } catch (e) {
    return {
      success: false,
      errors: [{ field: null, message: e instanceof Error ? e.message : 'unknown' }],
    }
  }
}
