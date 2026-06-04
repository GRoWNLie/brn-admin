/**
 * Shopify Admin GraphQL veri çekme fonksiyonları.
 * Server Components ve API routes bunları çağırır.
 */

import { shopifyFetch } from './shopify'
import { prisma } from './prisma'

// =========================================================
//                     DASHBOARD
// =========================================================

export interface DashboardSummary {
  totalSales: number
  orderCount: number
  averageOrderValue: number
  totalRefunds: number
  /** null = ShopifyQL erişimi yok; 0 = gerçekten 0 oturum */
  conversionRate: number | null
  /** null = ShopifyQL erişimi yok; 0 = gerçekten 0 oturum */
  sessions: number | null
  totalProducts: number
  totalCustomers: number
  shopName: string
  dailySales: Array<{ date: string; total: number }>
  topProducts: Array<{ title: string; soldQty: number; image: string | null }>
  currency: string
  rangeDays: number
}

interface OrdersForStatsResponse {
  orders: {
    edges: Array<{
      node: {
        id: string
        createdAt: string
        currentTotalPriceSet: { shopMoney: { amount: string; currencyCode: string } }
        totalRefundedSet?: { shopMoney: { amount: string } }
        lineItems: {
          edges: Array<{
            node: {
              quantity: number
              title: string
              product: { featuredImage: { url: string } | null } | null
            }
          }>
        }
      }
    }>
    pageInfo: { hasNextPage: boolean; endCursor: string | null }
  }
}

const DASHBOARD_ORDERS_QUERY = /* GraphQL */ `
  query DashboardOrders($query: String!, $cursor: String) {
    orders(first: 100, query: $query, sortKey: CREATED_AT, reverse: true, after: $cursor) {
      edges {
        cursor
        node {
          id
          createdAt
          currentTotalPriceSet { shopMoney { amount currencyCode } }
          totalRefundedSet { shopMoney { amount } }
          lineItems(first: 50) {
            edges {
              node {
                quantity
                title
                product { featuredImage { url } }
              }
            }
          }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`

// ShopifyQL: sessions (online_store_visitors)
const SESSIONS_QL_QUERY = /* GraphQL */ `
  query ShopSessions($query: String!) {
    shopifyqlQuery(query: $query) {
      __typename
      ... on TableResponse {
        tableData {
          rowData
          columns { name dataType }
        }
      }
      ... on ParseError {
        code
      }
    }
  }
`

// Shop meta (toplam ürün, müşteri sayısı, isim)
const SHOP_META_QUERY = /* GraphQL */ `
  query ShopMeta {
    shop { name }
    productsCount: products(first: 1) { edges { node { id } } }
  }
`

/**
 * "Oturum" sayısı — kendi beacon'ımızın (tracker.js) kaydettiği oturumlardan.
 * Seçilen aralıkta BAŞLAYAN (firstSeen) benzersiz oturumları sayar.
 * Her tarayıcı sekme oturumu ~1 session (GA mantığına yakın).
 * Beacon henüz kurulmamış / o aralıkta veri yoksa null döner → UI "—" gösterir.
 */
async function getSessionsCount(rangeDays: number): Promise<number | null> {
  try {
    const since = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000)
    const count = await prisma.visitorSession.count({
      where: { firstSeen: { gte: since } },
    })
    return count > 0 ? count : null
  } catch {
    return null
  }
}

/**
 * Shopify Dashboard'daki "Toplam Satışlar" değerini ShopifyQL ile birebir alır.
 * Bu, orders.currentTotalPriceSet toplamından farklı olabilir
 * (iadeler, indirimler vs. ShopifyQL'de farklı hesaplanır).
 */
async function getTotalSalesFromQL(rangeDays: number): Promise<number | null> {
  const duringMap: Record<number, string> = {
    1: 'today',
    7: 'last_7_days',
    30: 'last_30_days',
    90: 'last_90_days',
  }
  const during = duringMap[rangeDays] || `last_${rangeDays}_days`

  const candidates = [
    `FROM sales SHOW total_sales DURING ${during}`,
    `FROM sales SHOW gross_sales DURING ${during}`,
  ]
  for (const q of candidates) {
    try {
      const data = await shopifyFetch<{
        shopifyqlQuery: {
          __typename: string
          tableData?: { rowData: string[][]; columns: Array<{ name: string }> }
        }
      }>(SESSIONS_QL_QUERY, { variables: { query: q } })
      const td = data.shopifyqlQuery.tableData
      if (td && td.rowData.length > 0) {
        const v = parseFloat(String(td.rowData[0][0] ?? '0').replace(/[^\d.-]/g, ''))
        if (!isNaN(v)) return v
      }
    } catch {}
  }
  return null
}

async function getShopMeta(): Promise<{ shopName: string; totalProducts: number; totalCustomers: number }> {
  // Toplam ürün ve müşteri sayısı için ayrı count query'leri
  try {
    const data = await shopifyFetch<{
      shop: { name: string }
    }>(`query { shop { name } }`)
    return { shopName: data.shop.name, totalProducts: 0, totalCustomers: 0 }
  } catch {
    return { shopName: '', totalProducts: 0, totalCustomers: 0 }
  }
}

async function getProductsCount(): Promise<number> {
  // Shopify Admin API 2024-01+ : productsCount(query: String) { count }
  try {
    const data = await shopifyFetch<{ productsCount: { count: number } }>(
      `query { productsCount { count } }`
    )
    return data.productsCount?.count ?? 0
  } catch {
    return 0
  }
}

/**
 * Şu an mağazada bulunan canlı ziyaretçi sayısı.
 * Bu veri Shopify Live View API'sinden veya ShopifyQL ile alınır.
 */
export async function getLiveVisitorCount(): Promise<number> {
  const candidates = [
    `FROM online_store_visitors_realtime SHOW current_visitors`,
    `FROM realtime_online_store_visitors SHOW total_visitors`,
    `FROM sessions SHOW count(*) DURING last_1_minutes`,
  ]
  for (const q of candidates) {
    try {
      const data = await shopifyFetch<{
        shopifyqlQuery: {
          __typename: string
          tableData?: { rowData: string[][]; columns: Array<{ name: string }> }
        }
      }>(SESSIONS_QL_QUERY, { variables: { query: q } })
      const td = data.shopifyqlQuery.tableData
      if (td && td.rowData.length > 0) {
        const v = parseInt(String(td.rowData[0][0] ?? '0').replace(/[^\d]/g, ''), 10)
        if (!isNaN(v)) return v
      }
    } catch {}
  }
  return 0
}

async function getCustomersCount(): Promise<number> {
  // customers field için read_customers + protected_customer_data izni gerek;
  // başarısız olursa 0 dönüp dashboard'u kırma.
  try {
    const data = await shopifyFetch<{ customersCount: { count: number } }>(
      `query { customersCount { count } }`
    )
    return data.customersCount?.count ?? 0
  } catch {
    return 0
  }
}

export async function getDashboardSummary(rangeDays = 7): Promise<DashboardSummary> {
  const sinceIso = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000).toISOString()
  const query = `created_at:>=${sinceIso}`

  let allOrders: OrdersForStatsResponse['orders']['edges'] = []
  let cursor: string | null = null
  // Max 3 sayfa (300 sipariş) — performans için
  for (let i = 0; i < 3; i++) {
    const data: OrdersForStatsResponse = await shopifyFetch<OrdersForStatsResponse>(
      DASHBOARD_ORDERS_QUERY,
      { variables: { query, cursor }, cacheSeconds: 0 }
    )
    allOrders = allOrders.concat(data.orders.edges)
    if (!data.orders.pageInfo.hasNextPage) break
    cursor = data.orders.pageInfo.endCursor
  }

  // Paralel ekstra metrikleri çek (her biri optional, hata olursa sessizce 0 döner)
  const [sessionsRaw, shopMeta, productsCount, customersCount, qlSales] = await Promise.all([
    getSessionsCount(rangeDays),
    getShopMeta(),
    getProductsCount(),
    getCustomersCount(),
    getTotalSalesFromQL(rangeDays),
  ])
  const sessions = sessionsRaw  // number | null

  let totalSales = 0
  let totalRefunds = 0
  let currency = 'TRY'
  const productMap = new Map<string, { qty: number; image: string | null }>()
  const dailyMap = new Map<string, number>()

  // Tüm günleri 0 ile başlat (boş günler de görünsün)
  for (let i = rangeDays - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    const key = d.toISOString().slice(0, 10)
    dailyMap.set(key, 0)
  }

  for (const { node } of allOrders) {
    const amount = parseFloat(node.currentTotalPriceSet.shopMoney.amount)
    totalSales += amount
    currency = node.currentTotalPriceSet.shopMoney.currencyCode
    if (node.totalRefundedSet) {
      totalRefunds += parseFloat(node.totalRefundedSet.shopMoney.amount)
    }
    const dayKey = node.createdAt.slice(0, 10)
    dailyMap.set(dayKey, (dailyMap.get(dayKey) || 0) + amount)

    for (const li of node.lineItems.edges) {
      const t = li.node.title
      const prev = productMap.get(t)
      productMap.set(t, {
        qty: (prev?.qty || 0) + li.node.quantity,
        image: prev?.image ?? li.node.product?.featuredImage?.url ?? null,
      })
    }
  }

  const topProducts = Array.from(productMap.entries())
    .sort((a, b) => b[1].qty - a[1].qty)
    .slice(0, 5)
    .map(([title, info]) => ({ title, soldQty: info.qty, image: info.image }))

  const dailySales = Array.from(dailyMap.entries()).map(([date, total]) => ({ date, total }))
  const orderCount = allOrders.length

  // ShopifyQL'den gelen "Total Sales" Shopify Dashboard'la birebir uyuşur;
  // ona güven, yoksa kendi hesabımıza düş
  const finalTotalSales = qlSales !== null ? qlSales : totalSales

  return {
    totalSales: finalTotalSales,
    orderCount,
    averageOrderValue: orderCount > 0 ? finalTotalSales / orderCount : 0,
    totalRefunds,
    conversionRate: sessions !== null && sessions > 0 ? (orderCount / sessions) * 100 : null,
    sessions,
    totalProducts: productsCount,
    totalCustomers: customersCount,
    shopName: shopMeta.shopName,
    dailySales,
    topProducts,
    currency,
    rangeDays,
  }
}

// =========================================================
//                     ORDERS
// =========================================================

export interface OrderLineItemBrief {
  title: string
  sku: string | null
  barcode: string | null
  quantity: number
  image: string | null
}

export interface OrderListItem {
  id: string
  name: string
  createdAt: string
  customerName: string
  email: string | null
  total: string
  currency: string
  financialStatus: string | null
  fulfillmentStatus: string | null
  lineItems: OrderLineItemBrief[]
  totalQuantity: number
}

export interface OrderListResult {
  orders: OrderListItem[]
  pageInfo: { hasNextPage: boolean; endCursor: string | null; hasPreviousPage: boolean; startCursor: string | null }
}

const ORDERS_LIST_QUERY = /* GraphQL */ `
  query OrdersList($first: Int!, $after: String, $query: String) {
    orders(first: $first, after: $after, query: $query, sortKey: CREATED_AT, reverse: true) {
      edges {
        cursor
        node {
          id
          name
          createdAt
          email
          displayFinancialStatus
          displayFulfillmentStatus
          customer { displayName }
          currentTotalPriceSet { shopMoney { amount currencyCode } }
          lineItems(first: 50) {
            edges {
              node {
                title
                sku
                quantity
                image { url }
                variant { barcode }
              }
            }
          }
        }
      }
      pageInfo { hasNextPage endCursor hasPreviousPage startCursor }
    }
  }
`

export async function getOrders(opts: {
  first?: number
  after?: string | null
  search?: string
  financialStatus?: string
  fulfillmentStatus?: string
} = {}): Promise<OrderListResult> {
  const { first = 25, after = null, search, financialStatus, fulfillmentStatus } = opts

  const queryParts: string[] = []
  if (search) queryParts.push(search.includes(':') ? search : `name:*${search}* OR email:*${search}*`)
  if (financialStatus) queryParts.push(`financial_status:${financialStatus}`)
  if (fulfillmentStatus) queryParts.push(`fulfillment_status:${fulfillmentStatus}`)
  const query = queryParts.length > 0 ? queryParts.join(' AND ') : null

  const data = await shopifyFetch<{
    orders: {
      edges: Array<{ node: any }>
      pageInfo: { hasNextPage: boolean; endCursor: string | null; hasPreviousPage: boolean; startCursor: string | null }
    }
  }>(ORDERS_LIST_QUERY, { variables: { first, after, query } })

  return {
    orders: data.orders.edges.map(({ node }) => {
      const lineItems: OrderLineItemBrief[] = (node.lineItems?.edges ?? []).map((e: any) => ({
        title: e.node.title,
        sku: e.node.sku ?? null,
        barcode: e.node.variant?.barcode ?? null,
        quantity: e.node.quantity,
        image: e.node.image?.url ?? null,
      }))
      const totalQuantity = lineItems.reduce((s, li) => s + li.quantity, 0)
      return {
        id: node.id,
        name: node.name,
        createdAt: node.createdAt,
        customerName: node.customer?.displayName ?? '—',
        email: node.email,
        total: node.currentTotalPriceSet.shopMoney.amount,
        currency: node.currentTotalPriceSet.shopMoney.currencyCode,
        financialStatus: node.displayFinancialStatus,
        fulfillmentStatus: node.displayFulfillmentStatus,
        lineItems,
        totalQuantity,
      }
    }),
    pageInfo: data.orders.pageInfo,
  }
}

// =========================================================
//                     PRODUCTS
// =========================================================

export interface ProductListItem {
  id: string
  title: string
  handle: string
  vendor: string
  productType: string
  status: string
  totalInventory: number
  image: string | null
  price: string
  sku: string | null
  barcode: string | null
  currency: string
}

export interface ProductListResult {
  products: ProductListItem[]
  pageInfo: { hasNextPage: boolean; endCursor: string | null; hasPreviousPage: boolean; startCursor: string | null }
}

const PRODUCTS_LIST_QUERY = /* GraphQL */ `
  query ProductsList($first: Int!, $after: String, $query: String) {
    products(first: $first, after: $after, query: $query, sortKey: UPDATED_AT, reverse: true) {
      edges {
        cursor
        node {
          id
          title
          handle
          vendor
          productType
          status
          totalInventory
          featuredImage { url }
          variants(first: 1) {
            edges {
              node {
                sku
                barcode
                price
              }
            }
          }
        }
      }
      pageInfo { hasNextPage endCursor hasPreviousPage startCursor }
    }
  }
`

export async function getProducts(opts: {
  first?: number
  after?: string | null
  search?: string
} = {}): Promise<ProductListResult> {
  const { first = 25, after = null, search } = opts
  const query = search
    ? (search.includes(':') ? search : `title:*${search}* OR sku:*${search}* OR vendor:*${search}*`)
    : null

  const data = await shopifyFetch<{
    products: {
      edges: Array<{ node: any }>
      pageInfo: { hasNextPage: boolean; endCursor: string | null; hasPreviousPage: boolean; startCursor: string | null }
    }
  }>(PRODUCTS_LIST_QUERY, { variables: { first, after, query } })

  return {
    products: data.products.edges.map(({ node }) => {
      const variant = node.variants.edges[0]?.node
      return {
        id: node.id,
        title: node.title,
        handle: node.handle,
        vendor: node.vendor || '—',
        productType: node.productType || '—',
        status: node.status,
        totalInventory: node.totalInventory ?? 0,
        image: node.featuredImage?.url ?? null,
        price: variant?.price ?? '0.00',
        sku: variant?.sku ?? null,
        barcode: variant?.barcode ?? null,
        currency: 'TRY',
      }
    }),
    pageInfo: data.products.pageInfo,
  }
}

// =========================================================
//                     CUSTOMERS
// =========================================================

export interface CustomerListItem {
  id: string
  displayName: string
  email: string | null
  phone: string | null
  ordersCount: number
  totalSpent: string
  currency: string
  createdAt: string
}

export interface CustomerListResult {
  customers: CustomerListItem[]
  pageInfo: { hasNextPage: boolean; endCursor: string | null; hasPreviousPage: boolean; startCursor: string | null }
}

const CUSTOMERS_LIST_QUERY = /* GraphQL */ `
  query CustomersList($first: Int!, $after: String, $query: String) {
    customers(first: $first, after: $after, query: $query, sortKey: UPDATED_AT, reverse: true) {
      edges {
        cursor
        node {
          id
          displayName
          email
          phone
          numberOfOrders
          amountSpent { amount currencyCode }
          createdAt
        }
      }
      pageInfo { hasNextPage endCursor hasPreviousPage startCursor }
    }
  }
`

export async function getCustomers(opts: {
  first?: number
  after?: string | null
  search?: string
} = {}): Promise<CustomerListResult> {
  const { first = 25, after = null, search } = opts
  const query = search
    ? (search.includes(':') ? search : `email:*${search}* OR first_name:*${search}* OR last_name:*${search}*`)
    : null

  const data = await shopifyFetch<{
    customers: {
      edges: Array<{ node: any }>
      pageInfo: { hasNextPage: boolean; endCursor: string | null; hasPreviousPage: boolean; startCursor: string | null }
    }
  }>(CUSTOMERS_LIST_QUERY, { variables: { first, after, query } })

  return {
    customers: data.customers.edges.map(({ node }) => ({
      id: node.id,
      displayName: node.displayName,
      email: node.email,
      phone: node.phone,
      ordersCount: Number(node.numberOfOrders ?? 0),
      totalSpent: node.amountSpent?.amount ?? '0',
      currency: node.amountSpent?.currencyCode ?? 'TRY',
      createdAt: node.createdAt,
    })),
    pageInfo: data.customers.pageInfo,
  }
}

// =========================================================
//                     UTIL
// =========================================================

export function formatCurrency(amount: number | string, currency = 'TRY'): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount
  const sym = currency === 'TRY' ? '₺' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency
  return `${sym} ${n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
}
