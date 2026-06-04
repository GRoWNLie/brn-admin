/**
 * Kargo taşıyıcı entegrasyon katmanı — gönderi oluşturma + takip.
 * Kimlik bilgileri app-settings'ten okunur (CARGO_{CARRIER}_{FIELD}).
 *
 * MNG modern REST API kullanır (gerçek istek yapısı). Aras/Yurtiçi SOAP tabanlıdır;
 * yapı hazır, kimlik + WSDL bağlanınca aktif olur.
 */
import { getSetting } from './app-settings'

export type CarrierCode = 'MNG' | 'ARAS' | 'YURTICI'

export const CARRIERS: { code: CarrierCode; name: string }[] = [
  { code: 'MNG', name: 'MNG Kargo' },
  { code: 'ARAS', name: 'Aras Kargo' },
  { code: 'YURTICI', name: 'Yurtiçi Kargo' },
]

export interface ShipmentInput {
  orderNumber: string
  recipientName: string
  phone: string
  address: string
  city: string
  district?: string
  desi?: number
  codAmount?: number   // kapıda ödeme tutarı
}

export interface ShipmentResult { ok: boolean; trackingNumber?: string; message: string }
export interface TrackingResult { ok: boolean; status?: string; statusText?: string; message: string }
export interface ConnResult { ok: boolean; message: string }

export interface CargoCarrierAdapter {
  code: CarrierCode
  isConfigured(): Promise<boolean>
  testConnection(): Promise<ConnResult>
  createShipment(input: ShipmentInput): Promise<ShipmentResult>
  getTracking(trackingNumber: string): Promise<TrackingResult>
}

async function cred(carrier: string, field: string): Promise<string> {
  return getSetting(`CARGO_${carrier}_${field}`)
}

/** MNG Kargo — REST API (api.mngkargo.com.tr). */
class MngCarrier implements CargoCarrierAdapter {
  code = 'MNG' as const
  private base = 'https://api.mngkargo.com.tr/mngapi/api'

  async isConfigured() {
    return !!(await cred('MNG', 'CLIENT_ID') && await cred('MNG', 'CLIENT_SECRET') && await cred('MNG', 'CUSTOMER'))
  }
  private async headers() {
    return {
      'X-IBM-Client-Id': await cred('MNG', 'CLIENT_ID'),
      'X-IBM-Client-Secret': await cred('MNG', 'CLIENT_SECRET'),
      'Content-Type': 'application/json', 'Accept': 'application/json',
    }
  }
  async testConnection(): Promise<ConnResult> {
    if (!(await this.isConfigured())) return { ok: false, message: 'MNG Client ID/Secret/Müşteri no gerekli.' }
    try {
      const res = await fetch(`${this.base}/standardcmdapi/getcustomerinfo`, { headers: await this.headers() })
      return { ok: res.ok, message: res.ok ? 'MNG bağlantısı başarılı.' : `MNG hata (HTTP ${res.status}).` }
    } catch (e: any) { return { ok: false, message: e?.message || 'Bağlantı başarısız.' } }
  }
  async createShipment(input: ShipmentInput): Promise<ShipmentResult> {
    if (!(await this.isConfigured())) return { ok: false, message: 'MNG yapılandırılmadı.' }
    try {
      const body = {
        order: {
          referenceId: input.orderNumber,
          receiverName: input.recipientName, receiverPhone: input.phone,
          receiverAddress: input.address, city: input.city, district: input.district,
          desi: input.desi ?? 1, codAmount: input.codAmount ?? 0,
        },
      }
      const res = await fetch(`${this.base}/standardcmdapi/createorder`, {
        method: 'POST', headers: await this.headers(), body: JSON.stringify(body),
      })
      const text = await res.text()
      if (!res.ok) return { ok: false, message: `MNG ${res.status}: ${text.slice(0, 200)}` }
      const j = JSON.parse(text)
      return { ok: true, trackingNumber: j.trackingNumber || j.barcode || j.orderId, message: 'MNG gönderi oluşturuldu.' }
    } catch (e: any) { return { ok: false, message: e?.message || 'Gönderi oluşturulamadı.' } }
  }
  async getTracking(trackingNumber: string): Promise<TrackingResult> {
    if (!(await this.isConfigured())) return { ok: false, message: 'MNG yapılandırılmadı.' }
    try {
      const res = await fetch(`${this.base}/cargotracking/${encodeURIComponent(trackingNumber)}`, { headers: await this.headers() })
      const text = await res.text()
      if (!res.ok) return { ok: false, message: `MNG ${res.status}` }
      const j = JSON.parse(text)
      return { ok: true, status: j.statusCode, statusText: j.statusDescription || j.status, message: 'OK' }
    } catch (e: any) { return { ok: false, message: e?.message || 'Takip alınamadı.' } }
  }
}

/** Aras / Yurtiçi — SOAP tabanlı. Yapı hazır; WSDL + kimlik bağlanınca aktif. */
class SoapCarrier implements CargoCarrierAdapter {
  constructor(public code: CarrierCode, private label: string) {}
  async isConfigured() {
    return !!(await cred(this.code, 'USERNAME') && await cred(this.code, 'PASSWORD'))
  }
  async testConnection(): Promise<ConnResult> {
    const ok = await this.isConfigured()
    return { ok: false, message: ok
      ? `${this.label} kimliği tanımlı — SOAP servis bağlantısı (WSDL) eklenecek.`
      : `${this.label} kullanıcı adı/şifre gerekli.` }
  }
  async createShipment(): Promise<ShipmentResult> {
    return { ok: false, message: `${this.label} gönderi oluşturma SOAP entegrasyonu yakında (kimlik + WSDL gerekli).` }
  }
  async getTracking(): Promise<TrackingResult> {
    return { ok: false, message: `${this.label} takip SOAP entegrasyonu yakında.` }
  }
}

export function getCarrier(code: CarrierCode): CargoCarrierAdapter {
  switch (code) {
    case 'MNG': return new MngCarrier()
    case 'ARAS': return new SoapCarrier('ARAS', 'Aras Kargo')
    case 'YURTICI': return new SoapCarrier('YURTICI', 'Yurtiçi Kargo')
    default: throw new Error('Bilinmeyen taşıyıcı: ' + code)
  }
}

export function isCarrierCode(v: string): v is CarrierCode {
  return ['MNG', 'ARAS', 'YURTICI'].includes(v)
}
