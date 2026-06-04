/**
 * Aktif kargo gönderileri — fulfillment'lı sipariş + takip bilgileri.
 */
import { shopifyFetch } from './shopify'
import { findProviderByShopifyName, CargoProvider } from './cargo'

export interface ShipmentItem {
  orderId: string
  orderName: string
  customerName: string
  customerEmail: string | null
  fulfillmentId: string
  fulfillmentStatus: string
  createdAt: string
  trackingCompany: string | null
  trackingNumber: string | null
  trackingUrl: string | null
  provider: {
    id: string
    displayName: string
    logoEmoji: string
    brandColor: string
  } | null
  totalPrice: string
  currency: string
}

const SHIPMENTS_QUERY = /* GraphQL */ `
  query Shipments($first: Int!, $after: String, $query: String) {
    orders(first: $first, after: $after, query: $query, sortKey: PROCESSED_AT, reverse: true) {
      edges {
        cursor
        node {
          id
          name
          email
          customer { displayName }
          currentTotalPriceSet { shopMoney { amount currencyCode } }
          fulfillments(first: 5) {
            id
            status
            createdAt
            trackingInfo { company number url }
          }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`

export async function getActiveShipments(opts: {
  first?: number
  after?: string | null
} = {}): Promise<{ shipments: ShipmentItem[]; pageInfo: any }> {
  const { first = 50, after = null } = opts

  // Son 60 günün fulfillment'lı siparişleri
  const sinceIso = new Date(Date.now() - 60 * 86400 * 1000).toISOString()
  const query = `fulfillment_status:shipped OR fulfillment_status:partial OR fulfillment_status:fulfilled AND created_at:>=${sinceIso}`

  const data = await shopifyFetch<{
    orders: { edges: Array<{ node: any }>; pageInfo: any }
  }>(SHIPMENTS_QUERY, { variables: { first, after, query } })

  const shipments: ShipmentItem[] = []
  for (const { node } of data.orders.edges) {
    const fulfillments = node.fulfillments || []
    for (const f of fulfillments) {
      const ti = (f.trackingInfo || [])[0]
      const provider = findProviderByShopifyName(ti?.company)
      shipments.push({
        orderId: node.id,
        orderName: node.name,
        customerName: node.customer?.displayName ?? '—',
        customerEmail: node.email,
        fulfillmentId: f.id,
        fulfillmentStatus: f.status,
        createdAt: f.createdAt,
        trackingCompany: ti?.company ?? null,
        trackingNumber: ti?.number ?? null,
        trackingUrl: ti?.url ?? (provider && ti?.number ? provider.getTrackingUrl(ti.number) : null),
        provider: provider ? {
          id: provider.id,
          displayName: provider.displayName,
          logoEmoji: provider.logoEmoji,
          brandColor: provider.brandColor,
        } : null,
        totalPrice: node.currentTotalPriceSet?.shopMoney.amount ?? '0',
        currency: node.currentTotalPriceSet?.shopMoney.currencyCode ?? 'TRY',
      })
    }
  }

  return { shipments, pageInfo: data.orders.pageInfo }
}
