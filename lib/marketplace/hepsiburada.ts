/**
 * Hepsiburada adaptörü — gerçek Hepsiburada Entegrasyon API'si.
 * Docs: https://developers.hepsiburada.com
 *
 * Kimlik eşlemesi:
 *   apiKey    → username (entegrasyon kullanıcı adı)
 *   apiSecret → password
 *   sellerId  → merchantId
 *
 * Base URL'ler:
 *   Listing/Stok/Fiyat: https://listing-external.hepsiburada.com
 *   Siparişler (OMS):    https://oms-external.hepsiburada.com
 * Auth: Basic base64(username:password) + User-Agent "{merchantId}"
 */
import {
  MarketplaceAdapter, MarketplaceCredentials, ConnectionResult, StockPriceItem,
  SyncResult, MarketplaceOrderDTO, BuyboxDTO, ListProductInput,
} from './types'

const LISTING_BASE = 'https://listing-external.hepsiburada.com'
const OMS_BASE = 'https://oms-external.hepsiburada.com'

export class HepsiburadaAdapter implements MarketplaceAdapter {
  code = 'HEPSIBURADA' as const
  constructor(private cred: MarketplaceCredentials) {}

  isConfigured(): boolean {
    return !!(this.cred.apiKey && this.cred.apiSecret && this.cred.sellerId)
  }

  private headers(): Record<string, string> {
    const token = Buffer.from(`${this.cred.apiKey}:${this.cred.apiSecret}`).toString('base64')
    return {
      'Authorization': `Basic ${token}`,
      'User-Agent': String(this.cred.sellerId),
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    }
  }

  private async req<T = any>(base: string, path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(base + path, { ...init, headers: { ...this.headers(), ...(init?.headers || {}) } })
    const text = await res.text()
    if (!res.ok) throw new Error(`Hepsiburada ${res.status}: ${text.slice(0, 300)}`)
    try { return JSON.parse(text) as T } catch { return text as unknown as T }
  }

  async testConnection(): Promise<ConnectionResult> {
    if (!this.isConfigured()) return { ok: false, message: 'Kullanıcı adı, şifre ve merchantId gerekli.' }
    try {
      await this.req(LISTING_BASE, `/listings/merchantid/${this.cred.sellerId}?limit=1&offset=0`)
      return { ok: true, message: 'Hepsiburada bağlantısı başarılı.' }
    } catch (e: any) {
      return { ok: false, message: e?.message || 'Bağlantı başarısız.' }
    }
  }

  async syncStockPrice(items: StockPriceItem[]): Promise<SyncResult> {
    if (!this.isConfigured()) return { ok: false, message: 'Hepsiburada yapılandırılmadı.' }
    const withSku = items.filter(i => i.sku)
    if (withSku.length === 0) return { ok: false, message: 'merchantSku olan kalem yok.' }
    try {
      // Stok ve fiyat ayrı uçlardan güncellenir
      const stockBody = withSku.map(i => ({ merchantSku: i.sku, availableStock: Math.max(0, Math.floor(i.quantity)) }))
      const priceBody = withSku.map(i => ({ merchantSku: i.sku, price: Number(i.salePrice) }))

      const stockRes = await this.req<{ id?: string }>(
        LISTING_BASE, `/listings/merchantid/${this.cred.sellerId}/stock-uploads`,
        { method: 'POST', body: JSON.stringify(stockBody) }
      )
      const priceRes = await this.req<{ id?: string }>(
        LISTING_BASE, `/listings/merchantid/${this.cred.sellerId}/price-uploads`,
        { method: 'POST', body: JSON.stringify(priceBody) }
      )
      return {
        ok: true, message: `${withSku.length} kalem gönderildi (stok+fiyat).`,
        batchId: stockRes.id || priceRes.id, processed: withSku.length,
      }
    } catch (e: any) {
      return { ok: false, message: e?.message || 'Stok/fiyat gönderilemedi.' }
    }
  }

  async fetchOrders(opts?: { sinceDays?: number }): Promise<MarketplaceOrderDTO[]> {
    if (!this.isConfigured()) return []
    const sinceDays = opts?.sinceDays ?? 14
    const begin = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString()
    const data = await this.req<{ items?: any[] }>(
      OMS_BASE, `/orders/merchantid/${this.cred.sellerId}?beginDate=${encodeURIComponent(begin)}&limit=200&offset=0`
    )
    const list = data.items || (Array.isArray(data) ? (data as any[]) : [])
    return list.map((o: any) => ({
      orderNumber: String(o.orderNumber ?? o.id ?? o.orderId),
      status: o.status || o.packageStatus || 'Open',
      customerName: o.customerName || `${o.recipientName ?? ''}`.trim() || '—',
      total: Number(o.totalPrice?.amount ?? o.totalPrice ?? 0),
      currency: o.totalPrice?.currency || 'TRY',
      lineCount: Array.isArray(o.items) ? o.items.length : (Array.isArray(o.lines) ? o.lines.length : 0),
      orderedAt: o.orderDate ? new Date(o.orderDate).toISOString() : null,
      raw: o,
    }))
  }

  async fetchBuybox(barcodes: string[]): Promise<BuyboxDTO[]> {
    if (!this.isConfigured()) return []
    // Hepsiburada standart listing API'sinde rakip/buybox verisi gelmez; kendi fiyatımızı raporlarız.
    const data = await this.req<{ listings?: any[] }>(
      LISTING_BASE, `/listings/merchantid/${this.cred.sellerId}?limit=200&offset=0`
    )
    const wanted = new Set(barcodes.filter(Boolean))
    const list = data.listings || (Array.isArray(data) ? (data as any[]) : [])
    return list
      .filter((p: any) => wanted.size === 0 || wanted.has(p.barcode))
      .map((p: any) => ({
        sku: p.merchantSku ?? p.hepsiburadaSku ?? null,
        barcode: p.barcode ?? null,
        title: p.productName ?? p.title ?? '—',
        ourPrice: Number(p.price ?? 0) || null,
        buyboxPrice: null,
        isWinner: null,
        sellerCount: null,
      }))
  }

  async listProduct(input: ListProductInput): Promise<SyncResult> {
    if (!this.isConfigured()) return { ok: false, message: 'Hepsiburada yapılandırılmadı.' }
    // Ürün oluşturma kategori + öznitelik eşlemesi gerektirir (integrator product create).
    const body = [{
      merchantSku: input.sku || input.barcode,
      barcode: input.barcode,
      productName: input.title.slice(0, 200),
      price: input.price,
      availableStock: Math.max(0, input.stock),
      images: input.images || [],
      ...(input.categoryId ? { categoryId: input.categoryId } : {}),
    }]
    try {
      const r = await this.req<{ id?: string }>(
        LISTING_BASE, `/listings/merchantid/${this.cred.sellerId}/products`,
        { method: 'POST', body: JSON.stringify(body) }
      )
      return { ok: true, message: 'Ürün listeleme isteği gönderildi.', batchId: r.id }
    } catch (e: any) {
      return { ok: false, message: e?.message || 'Ürün listelenemedi.' }
    }
  }
}
