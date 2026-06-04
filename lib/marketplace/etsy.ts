/**
 * Etsy adaptörü — gerçek Etsy Open API v3.
 * Docs: https://developers.etsy.com/documentation
 *
 * Kimlik eşlemesi:
 *   apiKey    → keystring (x-api-key, aynı zamanda OAuth client_id)
 *   apiSecret → (PKCE'de kullanılmaz; ileride gerekirse)
 *   sellerId  → shopId
 *   extra.accessToken   → OAuth2 access token
 *   extra.refreshToken  → OAuth2 refresh token (varsa access token otomatik yenilenir)
 *
 * Auth: header x-api-key: {keystring} + Authorization: Bearer {accessToken}
 */
import {
  MarketplaceAdapter, MarketplaceCredentials, ConnectionResult, StockPriceItem,
  SyncResult, MarketplaceOrderDTO, BuyboxDTO, ListProductInput,
} from './types'

const BASE = 'https://api.etsy.com/v3/application'

export class EtsyAdapter implements MarketplaceAdapter {
  code = 'ETSY' as const
  private token: { value: string; exp: number } | null = null

  constructor(private cred: MarketplaceCredentials) {}

  isConfigured(): boolean {
    return !!(this.cred.apiKey && this.cred.sellerId &&
      (this.cred.extra?.accessToken || this.cred.extra?.refreshToken))
  }

  /** Refresh token varsa yeni access token alır; yoksa verilen access token'ı kullanır. */
  private async accessToken(): Promise<string> {
    if (this.token && Date.now() < this.token.exp - 60_000) return this.token.value
    const refresh = String(this.cred.extra?.refreshToken || '')
    if (refresh) {
      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: String(this.cred.apiKey || ''),
        refresh_token: refresh,
      })
      const res = await fetch('https://api.etsy.com/v3/public/oauth/token', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString(),
      })
      const text = await res.text()
      if (!res.ok) throw new Error(`Etsy OAuth ${res.status}: ${text.slice(0, 200)}`)
      const j = JSON.parse(text)
      this.token = { value: j.access_token, exp: Date.now() + (j.expires_in ?? 3600) * 1000 }
      return this.token.value
    }
    const at = String(this.cred.extra?.accessToken || '')
    this.token = { value: at, exp: Date.now() + 30 * 60 * 1000 }
    return at
  }

  private async req<T = any>(path: string, init?: RequestInit): Promise<T> {
    const tok = await this.accessToken()
    const res = await fetch(BASE + path, {
      ...init,
      headers: {
        'x-api-key': String(this.cred.apiKey || ''),
        'Authorization': `Bearer ${tok}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(init?.headers || {}),
      },
    })
    const text = await res.text()
    if (!res.ok) throw new Error(`Etsy ${res.status}: ${text.slice(0, 300)}`)
    try { return JSON.parse(text) as T } catch { return text as unknown as T }
  }

  async testConnection(): Promise<ConnectionResult> {
    if (!this.isConfigured()) return { ok: false, message: 'keystring, shopId ve access/refresh token gerekli.' }
    try {
      await this.req(`/shops/${this.cred.sellerId}`)
      return { ok: true, message: 'Etsy bağlantısı başarılı.' }
    } catch (e: any) {
      return { ok: false, message: e?.message || 'Bağlantı başarısız.' }
    }
  }

  /** SKU → listingId haritası (aktif listeler). */
  private async skuListingMap(): Promise<Map<string, number>> {
    const data = await this.req<{ results?: any[] }>(
      `/shops/${this.cred.sellerId}/listings/active?limit=100&includes=Inventory`
    )
    const map = new Map<string, number>()
    for (const l of data.results || []) {
      const skus: string[] = l.skus || []
      for (const s of skus) if (s) map.set(s, l.listing_id)
    }
    return map
  }

  async syncStockPrice(items: StockPriceItem[]): Promise<SyncResult> {
    if (!this.isConfigured()) return { ok: false, message: 'Etsy yapılandırılmadı.' }
    const withSku = items.filter(i => i.sku)
    if (withSku.length === 0) return { ok: false, message: 'SKU olan kalem yok.' }
    let ok = 0, failed = 0
    try {
      const map = await this.skuListingMap()
      for (const i of withSku) {
        const listingId = map.get(i.sku!)
        if (!listingId) { failed++; continue }
        try {
          // Etsy: tüm inventory objesi geri PUT edilir; eşleşen offering güncellenir
          const inv = await this.req<{ products?: any[] }>(`/listings/${listingId}/inventory`)
          const products = (inv.products || []).map((p: any) => ({
            sku: p.sku,
            property_values: p.property_values || [],
            offerings: (p.offerings || []).map((o: any) => ({
              price: p.sku === i.sku ? Number(i.salePrice) : Number(o.price?.amount ? o.price.amount / o.price.divisor : o.price),
              quantity: p.sku === i.sku ? Math.max(0, Math.floor(i.quantity)) : o.quantity,
              is_enabled: o.is_enabled !== false,
            })),
          }))
          await this.req(`/listings/${listingId}/inventory`, { method: 'PUT', body: JSON.stringify({ products }) })
          ok++
        } catch { failed++ }
        await new Promise(r => setTimeout(r, 150))
      }
      return { ok: failed === 0, message: `${ok} ürün güncellendi${failed ? `, ${failed} atlandı/hata` : ''}.`, processed: ok, failed }
    } catch (e: any) {
      return { ok: false, message: e?.message || 'Stok/fiyat güncellenemedi.' }
    }
  }

  async fetchOrders(opts?: { sinceDays?: number }): Promise<MarketplaceOrderDTO[]> {
    if (!this.isConfigured()) return []
    const sinceDays = opts?.sinceDays ?? 14
    const minCreated = Math.floor((Date.now() - sinceDays * 24 * 60 * 60 * 1000) / 1000)
    const data = await this.req<{ results?: any[] }>(
      `/shops/${this.cred.sellerId}/receipts?limit=100&min_created=${minCreated}`
    )
    return (data.results || []).map((r: any) => ({
      orderNumber: String(r.receipt_id),
      status: r.status || (r.is_shipped ? 'Shipped' : 'Open'),
      customerName: r.name || r.buyer_email || '—',
      total: Number(r.grandtotal?.amount ? r.grandtotal.amount / r.grandtotal.divisor : 0),
      currency: r.grandtotal?.currency_code || 'USD',
      lineCount: Array.isArray(r.transactions) ? r.transactions.length : 0,
      orderedAt: r.created_timestamp ? new Date(r.created_timestamp * 1000).toISOString() : null,
      raw: r,
    }))
  }

  async fetchBuybox(barcodes: string[]): Promise<BuyboxDTO[]> {
    if (!this.isConfigured()) return []
    // Etsy'de buybox kavramı yok; aktif listelerin kendi fiyatını raporlarız.
    const data = await this.req<{ results?: any[] }>(
      `/shops/${this.cred.sellerId}/listings/active?limit=100&includes=Inventory`
    )
    const wanted = new Set(barcodes.filter(Boolean))
    const out: BuyboxDTO[] = []
    for (const l of data.results || []) {
      const skus: string[] = l.skus || []
      const sku = skus[0] || null
      if (wanted.size > 0 && !(sku && wanted.has(sku))) continue
      out.push({
        sku, barcode: sku,
        title: l.title || '—',
        ourPrice: Number(l.price?.amount ? l.price.amount / l.price.divisor : 0) || null,
        buyboxPrice: null, isWinner: null, sellerCount: null,
      })
    }
    return out
  }

  async listProduct(input: ListProductInput): Promise<SyncResult> {
    if (!this.isConfigured()) return { ok: false, message: 'Etsy yapılandırılmadı.' }
    // Etsy liste oluşturma: taxonomy_id, who_made, when_made, shipping_profile_id zorunlu.
    // Minimum draft gönderiyoruz; eksik zorunlu alanlar extra'dan beslenmeli.
    const body = {
      quantity: Math.max(1, input.stock),
      title: input.title.slice(0, 140),
      description: input.description || input.title,
      price: input.price,
      who_made: (this.cred.extra?.whoMade as string) || 'i_did',
      when_made: (this.cred.extra?.whenMade as string) || 'made_to_order',
      taxonomy_id: Number(this.cred.extra?.taxonomyId || 0),
      shipping_profile_id: this.cred.extra?.shippingProfileId ? Number(this.cred.extra.shippingProfileId) : undefined,
      ...(input.sku ? { skus: [input.sku] } : {}),
    }
    try {
      const r = await this.req<{ listing_id: number }>(
        `/shops/${this.cred.sellerId}/listings`,
        { method: 'POST', body: JSON.stringify(body) }
      )
      return { ok: true, message: `Etsy draft liste oluşturuldu (listing_id: ${r.listing_id}).` }
    } catch (e: any) {
      return { ok: false, message: e?.message || 'Liste oluşturulamadı (zorunlu alanlar: taxonomy_id, shipping_profile_id).' }
    }
  }
}
