/**
 * Trendyol adaptörü — gerçek Trendyol Entegrasyon API'si.
 * Docs: https://developers.trendyol.com
 * Base: https://apigw.trendyol.com/integration  (eski: https://api.trendyol.com/sapigw)
 * Auth: Basic base64(apiKey:apiSecret) + User-Agent "{sellerId} - SelfIntegration"
 */
import {
  MarketplaceAdapter, MarketplaceCredentials, ConnectionResult, StockPriceItem,
  SyncResult, MarketplaceOrderDTO, BuyboxDTO, ListProductInput,
} from './types'

export class TrendyolAdapter implements MarketplaceAdapter {
  code = 'TRENDYOL' as const
  private base: string

  constructor(private cred: MarketplaceCredentials) {
    this.base = (cred.extra?.baseUrl as string) || 'https://apigw.trendyol.com/integration'
  }

  isConfigured(): boolean {
    return !!(this.cred.apiKey && this.cred.apiSecret && this.cred.sellerId)
  }

  private headers(): Record<string, string> {
    const token = Buffer.from(`${this.cred.apiKey}:${this.cred.apiSecret}`).toString('base64')
    return {
      'Authorization': `Basic ${token}`,
      'User-Agent': `${this.cred.sellerId} - SelfIntegration`,
      'Content-Type': 'application/json',
    }
  }

  private async req<T = any>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(this.base + path, { ...init, headers: { ...this.headers(), ...(init?.headers || {}) } })
    const text = await res.text()
    if (!res.ok) {
      throw new Error(`Trendyol ${res.status}: ${text.slice(0, 300)}`)
    }
    try { return JSON.parse(text) as T } catch { return text as unknown as T }
  }

  async testConnection(): Promise<ConnectionResult> {
    if (!this.isConfigured()) return { ok: false, message: 'API key, secret ve satıcı ID gerekli.' }
    try {
      // Satıcı adreslerini çek — kimlik geçerliyse 200 döner
      await this.req(`/sellers/${this.cred.sellerId}/addresses`)
      return { ok: true, message: 'Trendyol bağlantısı başarılı.' }
    } catch (e: any) {
      return { ok: false, message: e?.message || 'Bağlantı başarısız.' }
    }
  }

  async syncStockPrice(items: StockPriceItem[]): Promise<SyncResult> {
    if (!this.isConfigured()) return { ok: false, message: 'Trendyol yapılandırılmadı.' }
    const body = {
      items: items
        .filter(i => i.barcode)
        .map(i => ({
          barcode: i.barcode,
          quantity: Math.max(0, Math.floor(i.quantity)),
          salePrice: Number(i.salePrice),
          listPrice: Number(i.listPrice ?? i.salePrice),
        })),
    }
    if (body.items.length === 0) return { ok: false, message: 'Barkodu olan kalem yok (Trendyol barkod zorunlu).' }
    try {
      const r = await this.req<{ batchRequestId: string }>(
        `/inventory/sellers/${this.cred.sellerId}/products/price-and-inventory`,
        { method: 'POST', body: JSON.stringify(body) }
      )
      return { ok: true, message: `${body.items.length} kalem gönderildi.`, batchId: r.batchRequestId, processed: body.items.length }
    } catch (e: any) {
      return { ok: false, message: e?.message || 'Stok/fiyat gönderilemedi.' }
    }
  }

  async fetchOrders(opts?: { sinceDays?: number }): Promise<MarketplaceOrderDTO[]> {
    if (!this.isConfigured()) return []
    const sinceDays = opts?.sinceDays ?? 14
    const startDate = Date.now() - sinceDays * 24 * 60 * 60 * 1000
    const data = await this.req<{ content: any[] }>(
      `/order/sellers/${this.cred.sellerId}/orders?startDate=${startDate}&size=200&orderByField=PackageLastModifiedDate&orderByDirection=DESC`
    )
    return (data.content || []).map(o => ({
      orderNumber: String(o.orderNumber ?? o.id),
      status: o.shipmentPackageStatus || o.status || 'Created',
      customerName: `${o.customerFirstName ?? ''} ${o.customerLastName ?? ''}`.trim() || '—',
      total: Number(o.totalPrice ?? o.grossAmount ?? 0),
      currency: 'TRY',
      lineCount: Array.isArray(o.lines) ? o.lines.length : 0,
      orderedAt: o.orderDate ? new Date(Number(o.orderDate)).toISOString() : null,
      raw: o,
    }))
  }

  async fetchBuybox(barcodes: string[]): Promise<BuyboxDTO[]> {
    if (!this.isConfigured()) return []
    // Trendyol ürün listesinde kendi fiyatımız var; rakip/buybox kazanan verisi
    // standart API'de gelmez (Trendyol competitive-pricing erişimi gerekir).
    // Ürünleri çekip kendi fiyatımızı raporlarız; buyboxPrice/isWinner null kalır.
    const data = await this.req<{ content: any[] }>(
      `/product/sellers/${this.cred.sellerId}/products?size=200&approved=true`
    )
    const wanted = new Set(barcodes.filter(Boolean))
    return (data.content || [])
      .filter(p => wanted.size === 0 || wanted.has(p.barcode))
      .map(p => ({
        sku: p.stockCode ?? null,
        barcode: p.barcode ?? null,
        title: p.title ?? '—',
        ourPrice: Number(p.salePrice ?? p.listPrice ?? 0) || null,
        buyboxPrice: null,      // rekabet verisi API'de yok
        isWinner: null,
        sellerCount: null,
      }))
  }

  async listProduct(input: ListProductInput): Promise<SyncResult> {
    if (!this.isConfigured()) return { ok: false, message: 'Trendyol yapılandırılmadı.' }
    if (!input.barcode) return { ok: false, message: 'Trendyol için barkod zorunlu.' }
    // Tam ürün oluşturma kategori + marka + öznitelik eşlemesi gerektirir.
    // Minimum gövde ile gönderiyoruz; kategori/marka eşleme UI'si sonraki adım.
    const body = {
      items: [{
        barcode: input.barcode,
        title: input.title.slice(0, 100),
        productMainId: input.sku || input.barcode,
        stockCode: input.sku || input.barcode,
        quantity: Math.max(0, input.stock),
        listPrice: input.price,
        salePrice: input.price,
        ...(input.categoryId ? { categoryId: Number(input.categoryId) } : {}),
        images: (input.images || []).map(url => ({ url })),
      }],
    }
    try {
      const r = await this.req<{ batchRequestId: string }>(
        `/product/sellers/${this.cred.sellerId}/products`,
        { method: 'POST', body: JSON.stringify(body) }
      )
      return { ok: true, message: 'Ürün listeleme isteği gönderildi (batch).', batchId: r.batchRequestId }
    } catch (e: any) {
      return { ok: false, message: e?.message || 'Ürün listelenemedi.' }
    }
  }
}
