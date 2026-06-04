/**
 * e-Fatura servis sağlayıcı ortak arayüzü.
 * GİB doğrudan / Nilvera / Logo vb. hepsi bunu uygular.
 */
import type { InvoiceType } from '@/lib/einvoice'

export interface InvoiceLine {
  name: string
  quantity: number
  unitPrice: number   // KDV hariç birim
  vatRate: number     // % (örn 20)
  total: number       // KDV dahil satır toplamı
}

export interface CreateInvoiceInput {
  invoiceType: InvoiceType
  invoiceNumber: string
  date: Date
  customerName: string
  taxId: string | null
  taxOffice: string | null
  address: string
  email?: string | null
  lines: InvoiceLine[]
  totalAmount: number    // KDV dahil
  taxAmount: number
  currency: string
  orderId: string
  orderName: string
}

export interface ProviderResult {
  ok: boolean
  message: string
  gibUuid?: string | null
  invoiceNumber?: string | null
  xml?: string | null
  pdfBase64?: string | null
  pdfUrl?: string | null
  raw?: unknown
}

export interface StatusResult { ok: boolean; status?: string; message: string }
export interface PdfResult { ok: boolean; base64?: string | null; message: string }

export interface EFaturaProviderAdapter {
  type: string
  mode: 'sandbox' | 'live'
  createInvoice(input: CreateInvoiceInput): Promise<ProviderResult>
  cancelInvoice(gibUuid: string, reason?: string): Promise<ProviderResult>
  getInvoiceStatus(gibUuid: string): Promise<StatusResult>
  downloadPdf(gibUuid: string): Promise<PdfResult>
}

/** Sağlayıcı yapılandırması (config alanından decrypt edilmiş). */
export interface ProviderConfig {
  mode?: 'sandbox' | 'live'
  // GİB doğrudan entegrasyon için:
  username?: string
  password?: string
  certPemBase64?: string   // mali mühür (PEM, base64)
  certPassword?: string
  testEndpoint?: string
  liveEndpoint?: string
  // diğer sağlayıcılar için ek alanlar
  apiKey?: string
  apiUrl?: string
  [k: string]: unknown
}
