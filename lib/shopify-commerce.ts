/**
 * Shopify Commerce — Draft Orders, Abandoned Checkouts, Discount Codes, Gift Cards, Reports
 * Hepsi tek dosyada toplandı, küçük helper fonksiyonlar.
 */

import { shopifyFetch } from './shopify'

// =========================================================
//                     DRAFT ORDERS
// =========================================================

export interface DraftOrderListItem {
  id: string
  name: string
  status: string
  totalPrice: string
  currency: string
  customerName: string
  email: string | null
  invoiceUrl: string | null
  createdAt: string
}

const DRAFT_ORDERS_LIST = /* GraphQL */ `
  query DraftOrders($first: Int!, $after: String) {
    draftOrders(first: $first, after: $after, sortKey: UPDATED_AT, reverse: true) {
      edges {
        cursor
        node {
          id
          name
          status
          totalPriceSet { shopMoney { amount currencyCode } }
          customer { displayName }
          email
          invoiceUrl
          createdAt
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`

const DRAFT_ORDER_CREATE = /* GraphQL */ `
  mutation DraftCreate($input: DraftOrderInput!) {
    draftOrderCreate(input: $input) {
      draftOrder { id name invoiceUrl }
      userErrors { field message }
    }
  }
`

const DRAFT_ORDER_DELETE = /* GraphQL */ `
  mutation DraftDelete($input: DraftOrderDeleteInput!) {
    draftOrderDelete(input: $input) {
      deletedId
      userErrors { field message }
    }
  }
`

const DRAFT_ORDER_COMPLETE = /* GraphQL */ `
  mutation DraftComplete($id: ID!) {
    draftOrderComplete(id: $id) {
      draftOrder { id order { id name } }
      userErrors { field message }
    }
  }
`

const DRAFT_ORDER_SEND_INVOICE = /* GraphQL */ `
  mutation SendInvoice($id: ID!) {
    draftOrderInvoiceSend(id: $id) {
      draftOrder { id }
      userErrors { field message }
    }
  }
`

export async function getDraftOrders(opts: { first?: number; after?: string | null } = {}) {
  const { first = 25, after = null } = opts
  const data = await shopifyFetch<{
    draftOrders: { edges: Array<{ node: any }>; pageInfo: any }
  }>(DRAFT_ORDERS_LIST, { variables: { first, after } })

  return {
    drafts: data.draftOrders.edges.map(e => ({
      id: e.node.id,
      name: e.node.name,
      status: e.node.status,
      totalPrice: e.node.totalPriceSet.shopMoney.amount,
      currency: e.node.totalPriceSet.shopMoney.currencyCode,
      customerName: e.node.customer?.displayName ?? '—',
      email: e.node.email,
      invoiceUrl: e.node.invoiceUrl,
      createdAt: e.node.createdAt,
    })) as DraftOrderListItem[],
    pageInfo: data.draftOrders.pageInfo,
  }
}

export async function createDraftOrder(input: {
  lineItems?: Array<{ variantId?: string; title?: string; quantity: number; originalUnitPrice?: string }>
  email?: string
  note?: string
}) {
  const data = await shopifyFetch<{
    draftOrderCreate: { draftOrder: any; userErrors: any[] }
  }>(DRAFT_ORDER_CREATE, { variables: { input } })
  return {
    success: data.draftOrderCreate.userErrors.length === 0,
    draftOrder: data.draftOrderCreate.draftOrder,
    errors: data.draftOrderCreate.userErrors,
  }
}

export async function deleteDraftOrder(id: string) {
  const data = await shopifyFetch<{
    draftOrderDelete: { userErrors: any[] }
  }>(DRAFT_ORDER_DELETE, { variables: { input: { id } } })
  return {
    success: data.draftOrderDelete.userErrors.length === 0,
    errors: data.draftOrderDelete.userErrors,
  }
}

export async function completeDraftOrder(id: string) {
  const data = await shopifyFetch<{
    draftOrderComplete: { draftOrder: any; userErrors: any[] }
  }>(DRAFT_ORDER_COMPLETE, { variables: { id } })
  return {
    success: data.draftOrderComplete.userErrors.length === 0,
    orderId: data.draftOrderComplete.draftOrder?.order?.id,
    errors: data.draftOrderComplete.userErrors,
  }
}

export async function sendDraftInvoice(id: string) {
  const data = await shopifyFetch<{
    draftOrderInvoiceSend: { userErrors: any[] }
  }>(DRAFT_ORDER_SEND_INVOICE, { variables: { id } })
  return {
    success: data.draftOrderInvoiceSend.userErrors.length === 0,
    errors: data.draftOrderInvoiceSend.userErrors,
  }
}

// =========================================================
//                  ABANDONED CHECKOUTS
// =========================================================

export interface AbandonedCheckoutItem {
  id: string
  name: string
  totalPrice: string
  currency: string
  customerName: string
  email: string | null
  abandonedCheckoutUrl: string | null
  lineItemCount: number
  createdAt: string
  updatedAt: string
}

const ABANDONED_QUERY = /* GraphQL */ `
  query AbandonedCheckouts($first: Int!, $after: String) {
    abandonedCheckouts(first: $first, after: $after, sortKey: CREATED_AT, reverse: true) {
      edges {
        cursor
        node {
          id
          name
          totalPriceSet { shopMoney { amount currencyCode } }
          customer { displayName }
          customerEmail: defaultEmailAddress { emailAddress }
          abandonedCheckoutUrl
          lineItemsQuantity: lineItems(first: 1) { edges { node { quantity } } }
          createdAt
          updatedAt
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`

export async function getAbandonedCheckouts(opts: { first?: number; after?: string | null } = {}) {
  const { first = 25, after = null } = opts
  const data = await shopifyFetch<{
    abandonedCheckouts: { edges: Array<{ node: any }>; pageInfo: any }
  }>(ABANDONED_QUERY, { variables: { first, after } })

  return {
    checkouts: data.abandonedCheckouts.edges.map(e => ({
      id: e.node.id,
      name: e.node.name,
      totalPrice: e.node.totalPriceSet.shopMoney.amount,
      currency: e.node.totalPriceSet.shopMoney.currencyCode,
      customerName: e.node.customer?.displayName ?? '—',
      email: e.node.customerEmail?.emailAddress ?? null,
      abandonedCheckoutUrl: e.node.abandonedCheckoutUrl,
      lineItemCount: e.node.lineItemsQuantity?.edges?.length ?? 0,
      createdAt: e.node.createdAt,
      updatedAt: e.node.updatedAt,
    })) as AbandonedCheckoutItem[],
    pageInfo: data.abandonedCheckouts.pageInfo,
  }
}

// =========================================================
//                  DISCOUNT CODES (KUPONLAR)
// =========================================================

export interface DiscountListItem {
  id: string
  title: string
  code: string | null
  status: string
  type: 'CODE' | 'AUTOMATIC'
  startsAt: string | null
  endsAt: string | null
  usageCount: number
  summary: string
}

const DISCOUNTS_QUERY = /* GraphQL */ `
  query Discounts($first: Int!, $after: String, $query: String) {
    discountNodes(first: $first, after: $after, query: $query) {
      edges {
        cursor
        node {
          id
          discount {
            __typename
            ... on DiscountCodeBasic {
              title status startsAt endsAt asyncUsageCount summary
              codes(first: 1) { edges { node { code } } }
            }
            ... on DiscountCodeBxgy {
              title status startsAt endsAt asyncUsageCount summary
              codes(first: 1) { edges { node { code } } }
            }
            ... on DiscountCodeFreeShipping {
              title status startsAt endsAt asyncUsageCount summary
              codes(first: 1) { edges { node { code } } }
            }
            ... on DiscountAutomaticBasic {
              title status startsAt endsAt asyncUsageCount summary
            }
            ... on DiscountAutomaticFreeShipping {
              title status startsAt endsAt asyncUsageCount summary
            }
          }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`

const DISCOUNT_CODE_BASIC_CREATE = /* GraphQL */ `
  mutation DiscountBasicCreate($basicCodeDiscount: DiscountCodeBasicInput!) {
    discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
      codeDiscountNode { id }
      userErrors { field message }
    }
  }
`

const DISCOUNT_DELETE = /* GraphQL */ `
  mutation DiscountDelete($id: ID!) {
    discountCodeDelete(id: $id) {
      deletedCodeDiscountId
      userErrors { field message }
    }
  }
`

export async function getDiscounts(opts: { first?: number; after?: string | null; search?: string } = {}) {
  const { first = 25, after = null, search } = opts
  const data = await shopifyFetch<{
    discountNodes: { edges: Array<{ node: any }>; pageInfo: any }
  }>(DISCOUNTS_QUERY, { variables: { first, after, query: search || null } })

  return {
    discounts: data.discountNodes.edges.map(e => {
      const d = e.node.discount
      const isCode = d.__typename.startsWith('DiscountCode')
      return {
        id: e.node.id,
        title: d.title ?? '—',
        code: isCode ? (d.codes?.edges?.[0]?.node?.code ?? null) : null,
        status: d.status,
        type: isCode ? 'CODE' : 'AUTOMATIC' as 'CODE' | 'AUTOMATIC',
        startsAt: d.startsAt,
        endsAt: d.endsAt,
        usageCount: d.asyncUsageCount ?? 0,
        summary: d.summary ?? '',
      }
    }) as DiscountListItem[],
    pageInfo: data.discountNodes.pageInfo,
  }
}

/**
 * Basit yüzde indirimi kuponu oluşturur.
 * @example createDiscountBasic({ code: "YAZ20", title: "Yaz İndirimi", percentage: 20 })
 */
export async function createDiscountBasic(input: {
  code: string
  title: string
  percentage?: number       // 0-100 arası, %20 indirim için 20
  fixedAmount?: number      // ya da sabit tutar
  currency?: string
  startsAt?: string         // ISO
  endsAt?: string | null
  usageLimit?: number | null
  appliesOncePerCustomer?: boolean
}) {
  if (!input.percentage && !input.fixedAmount) {
    return { success: false, errors: [{ message: 'percentage veya fixedAmount gerekli' }] as any }
  }

  const customerGets: any = {
    items: { all: true },
    value: {},
  }
  if (input.percentage) {
    customerGets.value.percentage = input.percentage / 100
  } else if (input.fixedAmount) {
    customerGets.value.discountAmount = {
      amount: String(input.fixedAmount),
      appliesOnEachItem: false,
    }
  }

  const basicCodeDiscount = {
    title: input.title,
    code: input.code,
    startsAt: input.startsAt || new Date().toISOString(),
    endsAt: input.endsAt || null,
    customerSelection: { all: true },
    customerGets,
    appliesOncePerCustomer: !!input.appliesOncePerCustomer,
    usageLimit: input.usageLimit ?? null,
  }

  const data = await shopifyFetch<{
    discountCodeBasicCreate: { codeDiscountNode: { id: string } | null; userErrors: any[] }
  }>(DISCOUNT_CODE_BASIC_CREATE, { variables: { basicCodeDiscount } })

  return {
    success: data.discountCodeBasicCreate.userErrors.length === 0,
    id: data.discountCodeBasicCreate.codeDiscountNode?.id,
    errors: data.discountCodeBasicCreate.userErrors,
  }
}

export async function deleteDiscount(id: string) {
  const data = await shopifyFetch<{
    discountCodeDelete: { userErrors: any[] }
  }>(DISCOUNT_DELETE, { variables: { id } })
  return {
    success: data.discountCodeDelete.userErrors.length === 0,
    errors: data.discountCodeDelete.userErrors,
  }
}

// =========================================================
//                     GIFT CARDS
// =========================================================

export interface GiftCardListItem {
  id: string
  maskedCode: string
  initialValue: string
  balance: string
  currency: string
  customerName: string
  enabled: boolean
  expiresOn: string | null
  createdAt: string
}

const GIFT_CARDS_QUERY = /* GraphQL */ `
  query GiftCards($first: Int!, $after: String) {
    giftCards(first: $first, after: $after, sortKey: CREATED_AT, reverse: true) {
      edges {
        cursor
        node {
          id
          maskedCode
          initialValue { amount currencyCode }
          balance { amount }
          customer { displayName }
          enabled
          expiresOn
          createdAt
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`

const GIFT_CARD_CREATE = /* GraphQL */ `
  mutation GiftCardCreate($input: GiftCardCreateInput!) {
    giftCardCreate(input: $input) {
      giftCard { id maskedCode }
      giftCardCode
      userErrors { field message }
    }
  }
`

export async function getGiftCards(opts: { first?: number; after?: string | null } = {}) {
  const { first = 25, after = null } = opts
  const data = await shopifyFetch<{
    giftCards: { edges: Array<{ node: any }>; pageInfo: any }
  }>(GIFT_CARDS_QUERY, { variables: { first, after } })

  return {
    cards: data.giftCards.edges.map(e => ({
      id: e.node.id,
      maskedCode: e.node.maskedCode,
      initialValue: e.node.initialValue.amount,
      balance: e.node.balance.amount,
      currency: e.node.initialValue.currencyCode,
      customerName: e.node.customer?.displayName ?? '—',
      enabled: e.node.enabled,
      expiresOn: e.node.expiresOn,
      createdAt: e.node.createdAt,
    })) as GiftCardListItem[],
    pageInfo: data.giftCards.pageInfo,
  }
}

export async function createGiftCard(input: {
  initialValue: string
  currency?: string
  note?: string
  expiresOn?: string | null
  customerId?: string | null
}) {
  const data = await shopifyFetch<{
    giftCardCreate: {
      giftCard: { id: string; maskedCode: string } | null
      giftCardCode: string | null
      userErrors: any[]
    }
  }>(GIFT_CARD_CREATE, {
    variables: {
      input: {
        initialValue: input.initialValue,
        note: input.note,
        expiresOn: input.expiresOn,
        customerId: input.customerId,
      },
    },
  })

  return {
    success: data.giftCardCreate.userErrors.length === 0,
    giftCardCode: data.giftCardCreate.giftCardCode,
    maskedCode: data.giftCardCreate.giftCard?.maskedCode,
    errors: data.giftCardCreate.userErrors,
  }
}

// =========================================================
//                     CUSTOMER DETAIL
// =========================================================

export interface CustomerDetail {
  id: string
  displayName: string
  email: string | null
  phone: string | null
  note: string | null
  tags: string[]
  ordersCount: number
  totalSpent: string
  currency: string
  createdAt: string
  state: string
  addresses: Array<{
    id: string
    address1: string | null
    city: string | null
    province: string | null
    zip: string | null
    country: string | null
  }>
  recentOrders: Array<{
    id: string
    name: string
    createdAt: string
    total: string
    fulfillmentStatus: string | null
    financialStatus: string | null
  }>
}

const CUSTOMER_DETAIL_QUERY = /* GraphQL */ `
  query CustomerDetail($id: ID!) {
    customer(id: $id) {
      id
      displayName
      email
      phone
      note
      tags
      numberOfOrders
      amountSpent { amount currencyCode }
      createdAt
      state
      addresses { id address1 city province zip country }
      orders(first: 10, sortKey: PROCESSED_AT, reverse: true) {
        edges {
          node {
            id
            name
            createdAt
            currentTotalPriceSet { shopMoney { amount } }
            displayFulfillmentStatus
            displayFinancialStatus
          }
        }
      }
    }
  }
`

export async function getCustomerDetail(id: string): Promise<CustomerDetail | null> {
  const data = await shopifyFetch<{ customer: any }>(CUSTOMER_DETAIL_QUERY, {
    variables: { id },
  })
  const c = data.customer
  if (!c) return null

  return {
    id: c.id,
    displayName: c.displayName,
    email: c.email,
    phone: c.phone,
    note: c.note,
    tags: c.tags || [],
    ordersCount: Number(c.numberOfOrders ?? 0),
    totalSpent: c.amountSpent?.amount ?? '0',
    currency: c.amountSpent?.currencyCode ?? 'TRY',
    createdAt: c.createdAt,
    state: c.state,
    addresses: (c.addresses || []).map((a: any) => ({
      id: a.id,
      address1: a.address1,
      city: a.city,
      province: a.province,
      zip: a.zip,
      country: a.country,
    })),
    recentOrders: c.orders.edges.map((e: any) => ({
      id: e.node.id,
      name: e.node.name,
      createdAt: e.node.createdAt,
      total: e.node.currentTotalPriceSet.shopMoney.amount,
      fulfillmentStatus: e.node.displayFulfillmentStatus,
      financialStatus: e.node.displayFinancialStatus,
    })),
  }
}

// =========================================================
//                     SALES REPORT
// =========================================================

export interface SalesReportRow {
  date: string         // YYYY-MM-DD
  orders: number
  totalSales: number
  netSales: number
}

export async function getSalesReport(rangeDays: number = 30): Promise<{
  rows: SalesReportRow[]
  totalOrders: number
  totalSales: number
  averageOrderValue: number
  currency: string
}> {
  const sinceIso = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000).toISOString()

  const ORDERS_FOR_REPORT = /* GraphQL */ `
    query Orders($query: String!, $cursor: String) {
      orders(first: 250, query: $query, sortKey: CREATED_AT, after: $cursor) {
        edges {
          cursor
          node {
            createdAt
            currentTotalPriceSet { shopMoney { amount currencyCode } }
            totalRefundedSet { shopMoney { amount } }
          }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  `

  let allOrders: any[] = []
  let cursor: string | null = null
  for (let i = 0; i < 4; i++) {
    const data: { orders: { edges: Array<{ node: any }>; pageInfo: { hasNextPage: boolean; endCursor: string | null } } } =
      await shopifyFetch(ORDERS_FOR_REPORT, { variables: { query: `created_at:>=${sinceIso}`, cursor } })
    allOrders = allOrders.concat(data.orders.edges)
    if (!data.orders.pageInfo.hasNextPage) break
    cursor = data.orders.pageInfo.endCursor
  }

  const dailyMap = new Map<string, { orders: number; total: number; net: number }>()
  for (let i = rangeDays - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    dailyMap.set(d.toISOString().slice(0, 10), { orders: 0, total: 0, net: 0 })
  }

  let totalSales = 0
  let currency = 'TRY'
  for (const { node } of allOrders) {
    const key = node.createdAt.slice(0, 10)
    const amount = parseFloat(node.currentTotalPriceSet.shopMoney.amount)
    const refund = parseFloat(node.totalRefundedSet?.shopMoney?.amount ?? '0')
    currency = node.currentTotalPriceSet.shopMoney.currencyCode
    const cell = dailyMap.get(key) ?? { orders: 0, total: 0, net: 0 }
    cell.orders++
    cell.total += amount
    cell.net += amount - refund
    dailyMap.set(key, cell)
    totalSales += amount
  }

  const rows = Array.from(dailyMap.entries()).map(([date, c]) => ({
    date, orders: c.orders, totalSales: c.total, netSales: c.net,
  }))

  return {
    rows,
    totalOrders: allOrders.length,
    totalSales,
    averageOrderValue: allOrders.length > 0 ? totalSales / allOrders.length : 0,
    currency,
  }
}

// =========================================================
//                 PRODUCT PERFORMANCE REPORT
// =========================================================

export interface ProductPerfRow {
  productId: string | null
  title: string
  quantity: number
  revenue: number
  orderCount: number
}

export async function getProductPerformanceReport(rangeDays: number = 30): Promise<{
  rows: ProductPerfRow[]
  totalUnits: number
  totalRevenue: number
  currency: string
  productCount: number
}> {
  const sinceIso = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000).toISOString()

  const ORDERS_WITH_ITEMS = /* GraphQL */ `
    query Orders($query: String!, $cursor: String) {
      orders(first: 100, query: $query, sortKey: CREATED_AT, after: $cursor) {
        edges {
          cursor
          node {
            id
            lineItems(first: 50) {
              edges {
                node {
                  quantity
                  originalTotalSet { shopMoney { amount currencyCode } }
                  product { id }
                  title
                  variantTitle
                }
              }
            }
          }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  `

  const agg = new Map<string, ProductPerfRow>()
  const orderSeen = new Map<string, Set<string>>() // productKey -> orderIds
  let totalUnits = 0
  let totalRevenue = 0
  let currency = 'TRY'

  let cursor: string | null = null
  for (let i = 0; i < 5; i++) {
    const data: { orders: { edges: Array<{ node: any }>; pageInfo: { hasNextPage: boolean; endCursor: string | null } } } =
      await shopifyFetch(ORDERS_WITH_ITEMS, { variables: { query: `created_at:>=${sinceIso}`, cursor } })

    for (const { node: order } of data.orders.edges) {
      for (const { node: li } of order.lineItems.edges) {
        const key = li.product?.id ?? li.title
        const qty = li.quantity ?? 0
        const amount = parseFloat(li.originalTotalSet?.shopMoney?.amount ?? '0')
        currency = li.originalTotalSet?.shopMoney?.currencyCode ?? currency
        const row = agg.get(key) ?? {
          productId: li.product?.id ?? null,
          title: li.title || 'Bilinmeyen ürün',
          quantity: 0, revenue: 0, orderCount: 0,
        }
        row.quantity += qty
        row.revenue += amount
        agg.set(key, row)
        if (!orderSeen.has(key)) orderSeen.set(key, new Set())
        orderSeen.get(key)!.add(order.id)
        totalUnits += qty
        totalRevenue += amount
      }
    }

    if (!data.orders.pageInfo.hasNextPage) break
    cursor = data.orders.pageInfo.endCursor
  }

  const rows = Array.from(agg.entries())
    .map(([key, r]) => ({ ...r, orderCount: orderSeen.get(key)?.size ?? 0 }))
    .sort((a, b) => b.revenue - a.revenue)

  return {
    rows,
    totalUnits,
    totalRevenue,
    currency,
    productCount: rows.length,
  }
}

// =========================================================
//                    CONVERSION REPORT
// =========================================================

export async function getConversionReport(rangeDays: number = 30): Promise<{
  completedOrders: number
  abandonedCount: number
  abandonedValue: number
  abandonmentRate: number
  recoveredCount: number
  conversionFromCheckout: number
  averageOrderValue: number
  totalSales: number
  currency: string
}> {
  const sinceIso = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000).toISOString()

  // 1) Tamamlanan siparişler (satış raporundan)
  const sales = await getSalesReport(rangeDays)

  // 2) Terk edilmiş checkout'lar
  const ABANDONED = /* GraphQL */ `
    query Abandoned($query: String!, $cursor: String) {
      abandonedCheckouts(first: 100, query: $query, after: $cursor) {
        edges {
          cursor
          node {
            id
            completedAt
            totalPriceSet { shopMoney { amount currencyCode } }
          }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  `

  let abandonedCount = 0
  let recoveredCount = 0
  let abandonedValue = 0
  let currency = sales.currency
  let cursor: string | null = null

  try {
    for (let i = 0; i < 5; i++) {
      const data: { abandonedCheckouts: { edges: Array<{ node: any }>; pageInfo: { hasNextPage: boolean; endCursor: string | null } } } =
        await shopifyFetch(ABANDONED, { variables: { query: `created_at:>=${sinceIso}`, cursor } })

      for (const { node } of data.abandonedCheckouts.edges) {
        const amount = parseFloat(node.totalPriceSet?.shopMoney?.amount ?? '0')
        currency = node.totalPriceSet?.shopMoney?.currencyCode ?? currency
        if (node.completedAt) {
          recoveredCount++
        } else {
          abandonedCount++
          abandonedValue += amount
        }
      }
      if (!data.abandonedCheckouts.pageInfo.hasNextPage) break
      cursor = data.abandonedCheckouts.pageInfo.endCursor
    }
  } catch {
    // abandonedCheckouts scope yoksa sessizce 0 kabul et
  }

  const completedOrders = sales.totalOrders
  const totalCheckouts = completedOrders + abandonedCount
  const abandonmentRate = totalCheckouts > 0 ? (abandonedCount / totalCheckouts) * 100 : 0
  const conversionFromCheckout = totalCheckouts > 0 ? (completedOrders / totalCheckouts) * 100 : 0

  return {
    completedOrders,
    abandonedCount,
    abandonedValue,
    abandonmentRate,
    recoveredCount,
    conversionFromCheckout,
    averageOrderValue: sales.averageOrderValue,
    totalSales: sales.totalSales,
    currency,
  }
}

// =========================================================
//                  KAMPANYA KULLANIM RAPORU
// =========================================================

export interface CampaignUsageRow {
  code: string
  title: string
  status: string
  usageCount: number        // Shopify toplam kullanım
  ordersInRange: number     // seçili aralıkta bu kodla sipariş
  quantityInRange: number   // bu kodla satılan ürün adedi (aralık)
  revenueInRange: number    // bu kodla ciro (aralık)
  summary: string
}

const CAMPAIGN_ORDERS_QUERY = /* GraphQL */ `
  query CampaignOrders($query: String!, $cursor: String) {
    orders(first: 100, query: $query, after: $cursor, sortKey: CREATED_AT, reverse: true) {
      edges {
        node {
          discountCodes
          currentTotalPriceSet { shopMoney { amount currencyCode } }
          lineItems(first: 50) { edges { node { quantity } } }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`

export async function getCampaignUsageReport(rangeDays = 30): Promise<{
  rows: CampaignUsageRow[]
  currency: string
  totalOrders: number
  totalQuantity: number
  totalRevenue: number
  rangeDays: number
}> {
  // 1) İndirimleri çek (kullanım sayısı + başlık + durum)
  const { discounts } = await getDiscounts({ first: 100 })

  // 2) Aralıktaki siparişleri çek, koda göre topla
  const sinceIso = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000).toISOString()
  const agg = new Map<string, { orders: number; quantity: number; revenue: number }>()
  let currency = 'TRY'
  let cursor: string | null = null
  for (let i = 0; i < 5; i++) {
    const data: { orders: { edges: Array<{ node: any }>; pageInfo: { hasNextPage: boolean; endCursor: string | null } } } =
      await shopifyFetch(CAMPAIGN_ORDERS_QUERY, { variables: { query: `created_at:>=${sinceIso}`, cursor } })
    for (const { node } of data.orders.edges) {
      const codes: string[] = node.discountCodes || []
      if (codes.length === 0) continue
      const qty = (node.lineItems?.edges || []).reduce((s: number, e: any) => s + (e.node.quantity || 0), 0)
      const amount = parseFloat(node.currentTotalPriceSet?.shopMoney?.amount ?? '0')
      currency = node.currentTotalPriceSet?.shopMoney?.currencyCode ?? currency
      for (const raw of codes) {
        const code = String(raw).toUpperCase()
        const cur = agg.get(code) ?? { orders: 0, quantity: 0, revenue: 0 }
        cur.orders += 1; cur.quantity += qty; cur.revenue += amount
        agg.set(code, cur)
      }
    }
    if (!data.orders.pageInfo.hasNextPage) break
    cursor = data.orders.pageInfo.endCursor
  }

  // 3) Birleştir — kod tipli indirimler + aralıkta kullanılan kodlar
  const rows: CampaignUsageRow[] = []
  const seen = new Set<string>()
  for (const d of discounts) {
    if (!d.code) continue
    const key = d.code.toUpperCase()
    seen.add(key)
    const a = agg.get(key) ?? { orders: 0, quantity: 0, revenue: 0 }
    rows.push({
      code: d.code, title: d.title, status: d.status, usageCount: d.usageCount,
      ordersInRange: a.orders, quantityInRange: a.quantity, revenueInRange: a.revenue, summary: d.summary,
    })
  }
  // İndirim listesinde olmayan ama siparişte kullanılmış kodlar (silinmiş/otomatik)
  for (const [code, a] of Array.from(agg.entries())) {
    if (seen.has(code)) continue
    rows.push({ code, title: '(silinmiş/otomatik)', status: 'UNKNOWN', usageCount: a.orders, ordersInRange: a.orders, quantityInRange: a.quantity, revenueInRange: a.revenue, summary: '' })
  }

  rows.sort((x, y) => y.ordersInRange - x.ordersInRange || y.usageCount - x.usageCount)
  return {
    rows, currency, rangeDays,
    totalOrders: rows.reduce((s, r) => s + r.ordersInRange, 0),
    totalQuantity: rows.reduce((s, r) => s + r.quantityInRange, 0),
    totalRevenue: rows.reduce((s, r) => s + r.revenueInRange, 0),
  }
}

// =========================================================
//          MUSTERI SEPETI (terk edilmis, urun detayli)
// =========================================================

export interface CartLine { title: string; quantity: number; price: number; image: string | null }
export interface CustomerCart {
  id: string
  url: string | null
  createdAt: string
  total: number
  currency: string
  lines: CartLine[]
}

const ABANDONED_WITH_ITEMS = /* GraphQL */ `
  query CustomerAbandoned($q: String!) {
    abandonedCheckouts(first: 10, query: $q, sortKey: CREATED_AT, reverse: true) {
      edges {
        node {
          id
          abandonedCheckoutUrl
          createdAt
          totalPriceSet { shopMoney { amount currencyCode } }
          lineItems(first: 50) {
            edges { node { title quantity originalTotalPriceSet { shopMoney { amount } } image { url } } }
          }
        }
      }
    }
  }
`

/** Bir müşterinin terk edilmiş sepetlerini ürün detaylarıyla getirir. */
export async function getCustomerAbandonedCarts(customerGid: string): Promise<CustomerCart[]> {
  const numericId = customerGid.split('/').pop()
  if (!numericId) return []
  try {
    const data = await shopifyFetch<{ abandonedCheckouts: { edges: Array<{ node: any }> } }>(
      ABANDONED_WITH_ITEMS, { variables: { q: `customer_id:${numericId}` } }
    )
    return data.abandonedCheckouts.edges.map(e => {
      const n = e.node
      return {
        id: n.id,
        url: n.abandonedCheckoutUrl ?? null,
        createdAt: n.createdAt,
        total: parseFloat(n.totalPriceSet?.shopMoney?.amount ?? '0'),
        currency: n.totalPriceSet?.shopMoney?.currencyCode ?? 'TRY',
        lines: (n.lineItems?.edges || []).map((le: any) => ({
          title: le.node.title,
          quantity: le.node.quantity,
          price: parseFloat(le.node.originalTotalPriceSet?.shopMoney?.amount ?? '0'),
          image: le.node.image?.url ?? null,
        })),
      }
    })
  } catch {
    return []
  }
}
