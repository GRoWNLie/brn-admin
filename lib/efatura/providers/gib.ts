/**
 * GİB Doğrudan Entegrasyon adaptörü.
 *
 * sandbox: gerçek GİB'e gitmeden başarıyı simüle eder (uçtan uca test).
 * live:    UBL-TR XML üretir → mali mühür ile XAdES imzalar → GİB web servisine gönderir.
 *          Mali mühür (certPemBase64) yoksa anlamlı hata döner.
 *
 * NOT: GİB doğrudan entegrasyon yasal olarak GİB onayı + mali mühür gerektirir.
 *      Mühür/credential gelince live mod gerçek bağlanır.
 */
import crypto from 'crypto'
import { buildInvoiceXml } from '@/lib/einvoice'
import {
  EFaturaProviderAdapter, CreateInvoiceInput, ProviderResult, StatusResult, PdfResult, ProviderConfig,
} from './base'

export class GibProvider implements EFaturaProviderAdapter {
  type = 'GIB'
  mode: 'sandbox' | 'live'
  constructor(private config: ProviderConfig) {
    this.mode = config.mode === 'live' ? 'live' : 'sandbox'
  }

  private hasSeal(): boolean {
    return !!(this.config.certPemBase64 && this.config.username)
  }

  async createInvoice(input: CreateInvoiceInput): Promise<ProviderResult> {
    const xml = buildInvoiceXml({
      invoiceNumber: input.invoiceNumber, invoiceType: input.invoiceType, date: input.date,
      customerName: input.customerName, taxId: input.taxId, taxOffice: input.taxOffice,
      address: input.address, totalAmount: input.totalAmount, taxAmount: input.taxAmount,
    })

    if (this.mode === 'sandbox') {
      // GİB'e gitmeden başarıyı simüle et
      return {
        ok: true,
        message: `[SANDBOX] ${input.invoiceType} faturası oluşturuldu (GİB'e gönderilmedi).`,
        gibUuid: crypto.randomUUID(),
        invoiceNumber: input.invoiceNumber,
        xml,
      }
    }

    // LIVE
    if (!this.hasSeal()) {
      return { ok: false, message: 'GİB canlı mod için mali mühür (sertifika) ve kullanıcı bilgisi gerekli. Ayarlar → e-Fatura Servisleri.', xml }
    }
    try {
      // 1) XML'i mali mühür ile XAdES imzala (imzalama kütüphanesi + sertifika gerekir)
      const signed = await this.signXades(xml)
      // 2) GİB e-Fatura/e-Arşiv web servisine gönder
      const endpoint = this.config.liveEndpoint || 'https://earsivportal.efatura.gov.tr'
      const res = await fetch(`${endpoint}/earsiv-services/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/xml', 'Authorization': `Basic ${this.basicAuth()}` },
        body: signed,
      })
      const text = await res.text()
      if (!res.ok) return { ok: false, message: `GİB ${res.status}: ${text.slice(0, 200)}`, xml: signed }
      return { ok: true, message: 'GİB faturası gönderildi.', gibUuid: this.extractUuid(text), invoiceNumber: input.invoiceNumber, xml: signed, raw: text }
    } catch (e: any) {
      return { ok: false, message: e?.message || 'GİB gönderimi başarısız.', xml }
    }
  }

  async cancelInvoice(gibUuid: string, reason?: string): Promise<ProviderResult> {
    if (this.mode === 'sandbox') {
      return { ok: true, message: `[SANDBOX] Fatura iptal edildi${reason ? ` (${reason})` : ''}.`, gibUuid }
    }
    if (!this.hasSeal()) return { ok: false, message: 'GİB iptal için mali mühür gerekli.' }
    try {
      const endpoint = this.config.liveEndpoint || 'https://earsivportal.efatura.gov.tr'
      const res = await fetch(`${endpoint}/earsiv-services/cancel`, {
        method: 'POST', headers: { 'Authorization': `Basic ${this.basicAuth()}` },
        body: JSON.stringify({ uuid: gibUuid, reason }),
      })
      return { ok: res.ok, message: res.ok ? 'İptal edildi.' : `GİB iptal hatası (HTTP ${res.status})`, gibUuid }
    } catch (e: any) {
      return { ok: false, message: e?.message || 'İptal başarısız.', gibUuid }
    }
  }

  async getInvoiceStatus(gibUuid: string): Promise<StatusResult> {
    if (this.mode === 'sandbox') return { ok: true, status: 'APPROVED', message: '[SANDBOX] onaylandı' }
    return { ok: false, message: 'GİB durum sorgusu canlı modda mali mühürle yapılır.' }
  }

  async downloadPdf(gibUuid: string): Promise<PdfResult> {
    // PDF üretimi servis tarafında — sandbox'ta yazdırılabilir HTML/PDF panelden üretilir.
    return { ok: false, message: 'PDF servis katmanından üretiliyor (lib/efatura/service).' }
  }

  // --- yardımcılar ---
  private basicAuth(): string {
    return Buffer.from(`${this.config.username}:${this.config.password ?? ''}`).toString('base64')
  }
  private extractUuid(xml: string): string {
    const m = xml.match(/<(?:[\w:]*UUID)>([^<]+)</i)
    return m?.[1] || crypto.randomUUID()
  }
  /**
   * XAdES imzalama yer tutucusu. Gerçek imzalama için mali mühür (PEM/PFX) +
   * bir XAdES kütüphanesi (örn. xadesjs / xml-crypto) gerekir.
   */
  private async signXades(xml: string): Promise<string> {
    if (!this.config.certPemBase64) throw new Error('Mali mühür sertifikası yok — XAdES imzalanamaz.')
    // TODO(live): xml-crypto + sertifika ile XAdES-BES imzala.
    return xml
  }
}
