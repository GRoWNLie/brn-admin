/**
 * e-Fatura servis katmanı — sağlayıcı çözümleme + fatura kesme/iptal orkestrasyonu.
 * UI ve job worker bu fonksiyonları kullanır.
 */
import { prisma } from '@/lib/prisma'
import type { InvoiceType } from '@/lib/einvoice'
import { decryptJson } from './crypto'
import { EFaturaProviderAdapter, CreateInvoiceInput, ProviderConfig } from './providers/base'
import { GibProvider } from './providers/gib'
import { markPrepared } from '@/lib/order-workflow'

/** InvoiceLog'a yaz (hata/işlem). */
export async function logInvoice(
  level: 'info' | 'error', action: string, message: string,
  opts?: { invoiceId?: number; orderId?: string },
) {
  await prisma.invoiceLog.create({
    data: { level, action, message: message.slice(0, 2000), invoiceId: opts?.invoiceId ?? null, orderId: opts?.orderId ?? null },
  }).catch(() => {})
}

/** Config'ten adapter üretir (şimdilik GİB; ileride type'a göre genişler). */
export function buildAdapter(type: string, config: ProviderConfig): EFaturaProviderAdapter {
  switch (type) {
    case 'GIB':
    default:
      return new GibProvider(config)
  }
}

/** Fatura tipine uygun etkin sağlayıcıyı bulur; yoksa varsayılan sandbox GİB döner. */
export async function resolveProvider(invoiceType: InvoiceType): Promise<{ adapter: EFaturaProviderAdapter; providerId: number | null; mode: string }> {
  const providers = await prisma.efaturaProvider.findMany({ where: { enabled: true } })
  const match = providers.find(p => (p.invoiceTypes || '').includes(invoiceType)) || providers.find(p => p.isDefault) || providers[0]
  if (match) {
    const config = (decryptJson<ProviderConfig>(match.config) || {}) as ProviderConfig
    config.mode = (match.mode === 'live' ? 'live' : 'sandbox')
    return { adapter: buildAdapter(match.type, config), providerId: match.id, mode: config.mode }
  }
  // Hiç sağlayıcı yoksa: sandbox GİB (uçtan uca çalışsın)
  return { adapter: new GibProvider({ mode: 'sandbox' }), providerId: null, mode: 'sandbox' }
}

/** Mevcut bir EInvoice kaydını sağlayıcıya gönderip keser. */
export async function issueInvoice(invoiceId: number): Promise<{ ok: boolean; message: string }> {
  const inv = await prisma.eInvoice.findUnique({ where: { id: invoiceId } })
  if (!inv) return { ok: false, message: 'Fatura kaydı bulunamadı' }
  if (inv.status === 'SENT' || inv.status === 'APPROVED') return { ok: false, message: 'Fatura zaten kesilmiş' }

  const { adapter, providerId } = await resolveProvider(inv.invoiceType as InvoiceType)
  const input: CreateInvoiceInput = {
    invoiceType: inv.invoiceType as InvoiceType,
    invoiceNumber: inv.invoiceNumber || `BRN${new Date().getFullYear()}${String(inv.id).padStart(6, '0')}`,
    date: new Date(),
    customerName: inv.customerName, taxId: inv.taxId, taxOffice: inv.taxOffice,
    address: inv.customerAddress, lines: [],
    totalAmount: Number(inv.totalAmount), taxAmount: Number(inv.taxAmount),
    currency: inv.currency, orderId: inv.orderId, orderName: inv.orderName,
  }

  try {
    const r = await adapter.createInvoice(input)
    if (r.ok) {
      await prisma.eInvoice.update({
        where: { id: inv.id },
        data: {
          status: adapter.mode === 'sandbox' ? 'APPROVED' : 'SENT',
          gibUuid: r.gibUuid ?? undefined, invoiceNumber: r.invoiceNumber ?? inv.invoiceNumber,
          xmlContent: r.xml ?? inv.xmlContent, providerId, sentAt: new Date(), errorMsg: null,
        },
      })
      await logInvoice('info', 'create', r.message, { invoiceId: inv.id, orderId: inv.orderId })
      // Fatura kesildi → sipariş iş akışı "Hazırlandı"
      await markPrepared(inv.orderId, inv.orderName)
      return { ok: true, message: r.message }
    }
    await prisma.eInvoice.update({ where: { id: inv.id }, data: { status: 'ERROR', errorMsg: r.message, providerId } })
    await logInvoice('error', 'create', r.message, { invoiceId: inv.id, orderId: inv.orderId })
    return { ok: false, message: r.message }
  } catch (e: any) {
    const msg = e?.message || 'Fatura kesilemedi'
    await prisma.eInvoice.update({ where: { id: inv.id }, data: { status: 'ERROR', errorMsg: msg } }).catch(() => {})
    await logInvoice('error', 'create', msg, { invoiceId: inv.id, orderId: inv.orderId })
    return { ok: false, message: msg }
  }
}

/** Kesilmiş faturayı iptal eder. */
export async function cancelInvoice(invoiceId: number, reason?: string): Promise<{ ok: boolean; message: string }> {
  const inv = await prisma.eInvoice.findUnique({ where: { id: invoiceId } })
  if (!inv) return { ok: false, message: 'Fatura bulunamadı' }
  if (inv.status === 'CANCELLED') return { ok: false, message: 'Fatura zaten iptal' }
  const { adapter } = await resolveProvider(inv.invoiceType as InvoiceType)
  try {
    const r = await adapter.cancelInvoice(inv.gibUuid || '', reason)
    if (r.ok) {
      await prisma.eInvoice.update({ where: { id: inv.id }, data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason ?? null } })
      await logInvoice('info', 'cancel', r.message, { invoiceId: inv.id, orderId: inv.orderId })
      return { ok: true, message: r.message }
    }
    await logInvoice('error', 'cancel', r.message, { invoiceId: inv.id, orderId: inv.orderId })
    return { ok: false, message: r.message }
  } catch (e: any) {
    const msg = e?.message || 'İptal başarısız'
    await logInvoice('error', 'cancel', msg, { invoiceId: inv.id, orderId: inv.orderId })
    return { ok: false, message: msg }
  }
}
