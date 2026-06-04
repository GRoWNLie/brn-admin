/**
 * Pazaryeri entegrasyon katmanı — ortak tipler ve adaptör arayüzü.
 * Her pazaryeri (Trendyol, Hepsiburada, Amazon, Etsy) bu arayüzü uygular.
 */

export type MarketplaceCode = 'TRENDYOL' | 'HEPSIBURADA' | 'AMAZON' | 'ETSY'

export const MARKETPLACES: { code: MarketplaceCode; name: string; color: string; emoji: string }[] = [
  { code: 'TRENDYOL',    name: 'Trendyol',    color: '#F27A1A', emoji: '🟠' },
  { code: 'HEPSIBURADA', name: 'Hepsiburada', color: '#FF6000', emoji: '🛒' },
  { code: 'AMAZON',      name: 'Amazon',      color: '#FF9900', emoji: '📦' },
  { code: 'ETSY',        name: 'Etsy',        color: '#F1641E', emoji: '🎨' },
]

/** DB'deki MarketplaceIntegration'dan adaptöre verilen kimlik bilgisi. */
export interface MarketplaceCredentials {
  apiKey: string | null
  apiSecret: string | null
  sellerId: string | null
  extra: Record<string, unknown>
}

export interface ConnectionResult {
  ok: boolean
  message: string
}

/** Stok/fiyat güncelleme kalemi. */
export interface StockPriceItem {
  barcode?: string | null
  sku?: string | null
  quantity: number
  salePrice: number
  listPrice?: number
}

export interface SyncResult {
  ok: boolean
  message: string
  batchId?: string
  processed?: number
  failed?: number
}

/** Normalize edilmiş pazaryeri siparişi. */
export interface MarketplaceOrderDTO {
  orderNumber: string
  status: string
  customerName: string
  total: number
  currency: string
  lineCount: number
  orderedAt: string | null
  raw?: unknown
}

/** Buybox durumu (bir ürün/sku için). */
export interface BuyboxDTO {
  sku: string | null
  barcode: string | null
  title: string
  ourPrice: number | null
  buyboxPrice: number | null
  isWinner: boolean | null
  sellerCount: number | null
}

/** Ürün listeleme isteği (Shopify → pazaryeri). */
export interface ListProductInput {
  title: string
  sku: string | null
  barcode: string | null
  price: number
  stock: number
  description?: string
  images?: string[]
  brand?: string
  categoryId?: string
}

/** Tüm pazaryeri adaptörlerinin uyması gereken arayüz. */
export interface MarketplaceAdapter {
  code: MarketplaceCode
  /** Kimlik bilgileri tanımlı mı? */
  isConfigured(): boolean
  /** Bağlantıyı/kimliği test et. */
  testConnection(): Promise<ConnectionResult>
  /** Stok & fiyat gönder. */
  syncStockPrice(items: StockPriceItem[]): Promise<SyncResult>
  /** Siparişleri çek (normalize edilmiş). */
  fetchOrders(opts?: { sinceDays?: number }): Promise<MarketplaceOrderDTO[]>
  /** Buybox durumlarını çek. */
  fetchBuybox(barcodes: string[]): Promise<BuyboxDTO[]>
  /** Ürün listele/oluştur. */
  listProduct(input: ListProductInput): Promise<SyncResult>
}

/** Henüz uygulanmamış metodlar için ortak hata. */
export class NotImplementedError extends Error {
  constructor(mp: string, feature: string) {
    super(`${mp}: ${feature} henüz uygulanmadı (yakında).`)
  }
}
