/**
 * Kargo Firma Entegrasyonu
 *
 * Türk kargo firmaları için adapter pattern.
 * Her firma için:
 *   - displayName, logoEmoji, supportPhone
 *   - getTrackingUrl(trackingNumber) → o firmanın takip sayfası URL'i
 *   - getStatus?(trackingNumber) → API key varsa gerçek durum, yoksa mock
 *
 * Yeni firma eklemek için: PROVIDERS array'ine yeni entry ekle.
 */

export type CargoStatus =
  | 'pending'           // Henüz hazırlanmadı
  | 'preparing'         // Hazırlanıyor
  | 'shipped'           // Kargoya verildi
  | 'in_transit'        // Yolda
  | 'out_for_delivery'  // Dağıtımda
  | 'delivered'         // Teslim edildi
  | 'failed'            // Teslim edilemedi
  | 'returned'          // İade
  | 'unknown'

export interface CargoStatusInfo {
  status: CargoStatus
  label: string
  description?: string
  lastUpdate?: string  // ISO
  events?: Array<{ date: string; description: string; location?: string }>
}

export interface CargoProvider {
  /** Sistemde kullanılan id — örn "aras", "yurtici" */
  id: string
  /** UI'da gösterilecek isim */
  displayName: string
  /** Logo yerine emoji */
  logoEmoji: string
  /** Müşteri desteği telefon */
  supportPhone: string
  /** Renk teması */
  brandColor: string
  /** Shopify fulfillment tracking_company alanı için kullanılan resmi adı */
  shopifyTrackingCompany: string
  /** API entegrasyonu hazır mı? (Mock dahil) */
  hasApi: boolean

  /** Takip URL'i üret */
  getTrackingUrl(trackingNumber: string): string

  /** Opsiyonel: gerçek durum sorgu (API anahtarı varsa) */
  getStatus?(trackingNumber: string): Promise<CargoStatusInfo>
}

// =========================================================
//                     PROVIDERS
// =========================================================

export const PROVIDERS: CargoProvider[] = [
  {
    id: 'aras',
    displayName: 'Aras Kargo',
    logoEmoji: '🟧',
    supportPhone: '444 25 52',
    brandColor: '#F97316',
    shopifyTrackingCompany: 'Aras Kargo',
    hasApi: true,
    getTrackingUrl: (no) =>
      `https://kargotakip.araskargo.com.tr/mainpage.aspx?code=${encodeURIComponent(no)}`,
  },
  {
    id: 'yurtici',
    displayName: 'Yurtiçi Kargo',
    logoEmoji: '🔴',
    supportPhone: '444 99 99',
    brandColor: '#DC2626',
    shopifyTrackingCompany: 'Yurtici Kargo',
    hasApi: true,
    getTrackingUrl: (no) =>
      `https://www.yurticikargo.com/tr/online-servisler/gonderi-sorgula?code=${encodeURIComponent(no)}`,
  },
  {
    id: 'mng',
    displayName: 'MNG Kargo',
    logoEmoji: '🟣',
    supportPhone: '444 06 06',
    brandColor: '#7C3AED',
    shopifyTrackingCompany: 'MNG Kargo',
    hasApi: true,
    getTrackingUrl: (no) =>
      `https://kargotakip.mngkargo.com.tr/?takipno=${encodeURIComponent(no)}`,
  },
  {
    id: 'ptt',
    displayName: 'PTT Kargo',
    logoEmoji: '🟡',
    supportPhone: '444 17 88',
    brandColor: '#FBBF24',
    shopifyTrackingCompany: 'PTT Kargo',
    hasApi: false,
    getTrackingUrl: (no) =>
      `https://gonderitakip.ptt.gov.tr/Track/summary/${encodeURIComponent(no)}`,
  },
  {
    id: 'surat',
    displayName: 'Sürat Kargo',
    logoEmoji: '🟦',
    supportPhone: '444 11 33',
    brandColor: '#1D4ED8',
    shopifyTrackingCompany: 'Surat Kargo',
    hasApi: true,
    getTrackingUrl: (no) =>
      `https://www.suratkargo.com.tr/KargoTakip/?kargotakipno=${encodeURIComponent(no)}`,
  },
  {
    id: 'hepsijet',
    displayName: 'HepsiJet',
    logoEmoji: '🟠',
    supportPhone: '0850 311 35 00',
    brandColor: '#EA580C',
    shopifyTrackingCompany: 'HepsiJET',
    hasApi: true,
    getTrackingUrl: (no) =>
      `https://www.hepsijet.com/gonderi-takibi?trackingNumber=${encodeURIComponent(no)}`,
  },
  {
    id: 'ups',
    displayName: 'UPS Kargo',
    logoEmoji: '🟫',
    supportPhone: '444 00 66',
    brandColor: '#92400E',
    shopifyTrackingCompany: 'UPS',
    hasApi: false,
    getTrackingUrl: (no) =>
      `https://www.ups.com/track?tracknum=${encodeURIComponent(no)}&loc=tr_TR`,
  },
]

// Helper map
const PROVIDER_MAP: Record<string, CargoProvider> = Object.fromEntries(
  PROVIDERS.map(p => [p.id, p])
)

export function getCargoProvider(id: string): CargoProvider | null {
  return PROVIDER_MAP[id.toLowerCase()] ?? null
}

/** Shopify'ın trackingCompany değerinden bizim provider'ı bulur */
export function findProviderByShopifyName(name: string | null | undefined): CargoProvider | null {
  if (!name) return null
  const lower = name.toLowerCase().replace(/\s+/g, '')
  for (const p of PROVIDERS) {
    if (p.shopifyTrackingCompany.toLowerCase().replace(/\s+/g, '') === lower) return p
    if (p.displayName.toLowerCase().replace(/\s+/g, '') === lower) return p
    if (p.id === lower) return p
  }
  return null
}

// =========================================================
//                     STATUS HELPER
// =========================================================

export const STATUS_LABEL: Record<CargoStatus, { label: string; color: string; bg: string }> = {
  pending:          { label: 'Beklemede',          color: '#92400E', bg: '#FEF3C7' },
  preparing:        { label: 'Hazırlanıyor',       color: '#1E40AF', bg: '#DBEAFE' },
  shipped:          { label: 'Kargoya Verildi',    color: '#1E40AF', bg: '#DBEAFE' },
  in_transit:       { label: 'Yolda',              color: '#7C3AED', bg: '#EDE9FE' },
  out_for_delivery: { label: 'Dağıtımda',          color: '#F97316', bg: '#FED7AA' },
  delivered:        { label: 'Teslim Edildi',      color: '#065F46', bg: '#D1FAE5' },
  failed:           { label: 'Teslim Edilemedi',   color: '#991B1B', bg: '#FEE2E2' },
  returned:         { label: 'İade Edildi',        color: '#991B1B', bg: '#FEE2E2' },
  unknown:          { label: 'Bilinmiyor',         color: '#6B7280', bg: '#F3F4F6' },
}

/**
 * Mock kargo durumu üretir (API entegrasyonu hazır olunca silinir).
 * Takip numarasının son rakamına göre deterministik bir durum üretir
 * (her zaman aynı sonuç döner — UI test için).
 */
export function mockCargoStatus(trackingNumber: string): CargoStatusInfo {
  const lastDigit = parseInt(trackingNumber.replace(/\D/g, '').slice(-1) || '0', 10)
  const statuses: CargoStatus[] = [
    'preparing', 'shipped', 'in_transit', 'in_transit', 'out_for_delivery',
    'delivered', 'delivered', 'delivered', 'failed', 'returned',
  ]
  const status = statuses[lastDigit] ?? 'unknown'
  const meta = STATUS_LABEL[status]

  const now = Date.now()
  return {
    status,
    label: meta.label,
    description: `Tahmini durum (mock veri — API entegrasyonu hazır olmadığı için)`,
    lastUpdate: new Date(now - lastDigit * 3600 * 1000).toISOString(),
    events: [
      { date: new Date(now - 2 * 86400 * 1000).toISOString(), description: 'Gönderi merkeze ulaştı', location: 'İstanbul Transfer' },
      { date: new Date(now - 86400 * 1000).toISOString(), description: 'Dağıtım şubesine sevk edildi', location: 'Hedef Şube' },
      { date: new Date(now - 3600 * 1000).toISOString(), description: meta.label, location: '—' },
    ],
  }
}
