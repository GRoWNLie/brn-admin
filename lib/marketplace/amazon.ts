/**
 * Amazon adaptörü — gerçek Amazon SP-API (Selling Partner API).
 * Docs: https://developer-docs.amazon.com/sp-api
 *
 * Kimlik eşlemesi:
 *   apiKey    → LWA client_id
 *   apiSecret → LWA client_secret
 *   sellerId  → Seller (Merchant) ID
 *   extra.refreshToken   → LWA refresh token
 *   extra.marketplaceId  → ör. A1PA6795UKMFR9 (DE), A33AVAJ2PDY3EV (TR)
 *   extra.region         → 'eu' | 'na' | 'fe'  (varsayılan 'eu')
 *
 * Kimlik doğrulama: LWA refresh_token → access_token; header x-amz-access-token.
 */
import {
  MarketplaceAdapter, MarketplaceCredentials, ConnectionResult, StockPriceItem,
  SyncResult, MarketplaceOrderDTO, BuyboxDTO, ListProductInput,
} from './types'

const REGION_HOST: Record<string, string> = {
  eu: 'https://sellingpartnerapi-eu.amazon.com',
  na: 'https://sellingpartnerapi-na.amazon.com',
  fe: 'https://sellingpartnerapi-fe.amazon.com',
}

export class AmazonAdapter implements MarketplaceAdapter {
  code = 'AMAZON' as const
  private host: string
  private mp: string
  private token: { value: string; exp: number } | null = null

  constructor(private cred: MarketplaceCredentials) {
    const region = (cred.extra?.region as string) || 'eu'
    this.host = REGION_HOST[region] || REGION_HOST.eu
    this.mp = (cred.extra?.marketplaceId as string) || ''
  }

  isConfigured(): boolean {
    return !!(this.cred.apiKey && this.cred.apiSecret && this.cred.extra?.refreshToken && this.mp)
  }

  /** LWA refresh_token → access_token (1 saat, cache'li). */
  private async accessToken(): Promise<string> {
    if (this.token && Date.now() < this.token.exp - 60_000) return this.token.value
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: String(this.cred.extra?.refreshToken || ''),
      client_id: String(this.cred.apiKey || ''),
      client_secret: String(this.cred.apiSecret || ''),
    })
    const res = await fetch('https://api.amazon.com/auth/o2/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString(),
    })
    const text = await res.text()
    if (!res.ok) throw new Error(`Amazon LWA ${res.status}: ${text.slice(0, 200)}`)
    const j = JSON.parse(text)
    this.token = { value: j.access_token, exp: Date.now() + (j.expires_in ?? 3600) * 1000 }
    return this.token.value
  }

  private async req<T = any>(path: string, init?: RequestInit): Promise<T> {
    const tok = await this.accessToken()
    const res = await fetch(this.host + path, {
      ...init,
      headers: { 'x-amz-access-token': tok, 'Content-Type': 'application/json', 'Accept': 'application/json', ...(init?.headers || {}) },
    })
    const text = await res.text()
    if (!res.ok) throw new Error(`Amazon ${res.status}: ${text.slice(0, 300)}`)
    try { return JSON.parse(text) as T } catch { return text as unknown as T }
  }

  async testConnection(): Promise<ConnectionResult> {
    if (!this.isConfigured()) return { ok: false, message: 'client_id, client_secret, refreshToken ve marketplaceId gerekli.' }
    try {
      await this.req('/sellers/v1/marketplaceParticipations')
      return { ok: true, message: 'Amazon SP-API bağlantısı başarılı.' }
    } catch (e: any) {
      return { ok: false, message: e?.message || 'Bağlantı başarısız.' }
    }
  }

  async syncStockPrice(items: StockPriceItem[]): Promise<SyncResult> {
    if (!this.isConfigured()) return { ok: false, message: 'Amazon yapılandırılmadı.' }
    const withSku = items.filter(i => i.sku)
    if (withSku.length === 0) return { ok: false, message: 'SKU olan kalem yok.' }
    const productType = (this.cred.extra?.defaultProductType as string) || 'PRODUCT'
    let ok = 0, failed = 0
    // Listings Items PATCH — her SKU için stok + fiyat
    for (const i of withSku.slice(0, 50)) {
      try {
        await this.req(
          `/listings/2021-08-01/items/${this.cred.sellerId}/${encodeURIComponent(i.sku!)}?marketplaceIds=${this.mp}`,
          {
            method: 'PATCH',
            body: JSON.stringify({
              productType,
              patches: [
                { op: 'replace', path: '/attributes/fulfillment_availability', value: [{ fulfillment_channel_code: 'DEFAULT', quantity: Math.max(0, Math.floor(i.quantity)) }] },
                { op: 'replace', path: '/attributes/purchasable_offer', value: [{ marketplace_id: this.mp, currency: 'EUR', our_price: [{ schedule: [{ value_with_tax: Number(i.salePrice) }] }] }] },
              ],
            }),
          }
        )
        ok++
      } catch { failed++ }
      await new Promise(r => setTimeout(r, 120))
    }
    return { ok: failed === 0, message: `${ok} kalem güncellendi${failed ? `, ${failed} hata` : ''}.`, processed: ok, failed }
  }

  async fetchOrders(opts?: { sinceDays?: number }): Promise<MarketplaceOrderDTO[]> {
    if (!this.isConfigured()) return []
    const sinceDays = opts?.sinceDays ?? 14
    const after = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString()
    const data = await this.req<{ payload?: { Orders?: any[] } }>(
      `/orders/v0/orders?MarketplaceIds=${this.mp}&CreatedAfter=${encodeURIComponent(after)}`
    )
    const orders = data.payload?.Orders || []
    return orders.map((o: any) => ({
      orderNumber: String(o.AmazonOrderId),
      status: o.OrderStatus || 'Pending',
      customerName: o.BuyerInfo?.BuyerName || '—',
      total: Number(o.OrderTotal?.Amount ?? 0),
      currency: o.OrderTotal?.CurrencyCode || 'EUR',
      lineCount: Number(o.NumberOfItemsShipped ?? 0) + Number(o.NumberOfItemsUnshipped ?? 0),
      orderedAt: o.PurchaseDate || null,
      raw: o,
    }))
  }

  async fetchBuybox(barcodes: string[]): Promise<BuyboxDTO[]> {
    if (!this.isConfigured()) return []
    // Amazon GERÇEK buybox verir: Product Pricing API getListingOffers (SellerSKU bazlı).
    const skus = barcodes.filter(Boolean).slice(0, 20)
    const out: BuyboxDTO[] = []
    for (const sku of skus) {
      try {
        const d = await this.req<{ payload?: any }>(
          `/products/pricing/v0/listings/${encodeURIComponent(sku)}/offers?MarketplaceId=${this.mp}&ItemCondition=New`
        )
        const offers: any[] = d.payload?.Offers || []
        const summary = d.payload?.Summary
        const buybox = offers.find(o => o.IsBuyBoxWinner)
        const mine = offers.find(o => o.MyOffer)
        out.push({
          sku, barcode: sku,
          title: d.payload?.ASIN || sku,
          ourPrice: mine ? Number(mine.ListingPrice?.Amount ?? 0) : null,
          buyboxPrice: buybox ? Number(buybox.ListingPrice?.Amount ?? 0) : (summary?.BuyBoxPrices?.[0]?.ListingPrice?.Amount ?? null),
          isWinner: mine ? !!mine.IsBuyBoxWinner : (buybox ? false : null),
          sellerCount: summary?.NumberOfOffers?.[0]?.OfferCount ?? offers.length,
        })
      } catch {
        out.push({ sku, barcode: sku, title: sku, ourPrice: null, buyboxPrice: null, isWinner: null, sellerCount: null })
      }
      await new Promise(r => setTimeout(r, 150))
    }
    return out
  }

  async listProduct(input: ListProductInput): Promise<SyncResult> {
    if (!this.isConfigured()) return { ok: false, message: 'Amazon yapılandırılmadı.' }
    if (!input.sku) return { ok: false, message: 'SKU gerekli.' }
    const productType = (this.cred.extra?.defaultProductType as string) || 'PRODUCT'
    try {
      await this.req(
        `/listings/2021-08-01/items/${this.cred.sellerId}/${encodeURIComponent(input.sku)}?marketplaceIds=${this.mp}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            productType,
            requirements: 'LISTING',
            attributes: {
              item_name: [{ value: input.title, marketplace_id: this.mp }],
              ...(input.barcode ? { externally_assigned_product_identifier: [{ value: input.barcode, type: 'ean', marketplace_id: this.mp }] } : {}),
              fulfillment_availability: [{ fulfillment_channel_code: 'DEFAULT', quantity: Math.max(0, input.stock) }],
              purchasable_offer: [{ marketplace_id: this.mp, currency: 'EUR', our_price: [{ schedule: [{ value_with_tax: input.price }] }] }],
            },
          }),
        }
      )
      return { ok: true, message: 'Ürün listeleme isteği gönderildi (Listings Items).' }
    } catch (e: any) {
      return { ok: false, message: e?.message || 'Ürün listelenemedi.' }
    }
  }
}
