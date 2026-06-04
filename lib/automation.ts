/**
 * Pazarlama Otomasyonu — tetikleyici tabanlı email akışları.
 *
 * Akışlar DB'de (AutomationFlow) tanımlanır. Şimdilik manuel "Şimdi Çalıştır"
 * ile veya bir cron job ile tetiklenir. Gönderim lib/email.ts üzerinden yapılır
 * (RESEND_API_KEY yoksa MOCK).
 */

import { prisma } from './prisma'
import { sendEmail, EmailTemplates } from './email'
import { getAbandonedCheckouts } from './shopify-commerce'

export const TRIGGER_LABELS: Record<string, { label: string; icon: string; desc: string }> = {
  abandoned_cart: { label: 'Terk Edilmiş Sepet', icon: '🛒', desc: 'Sepeti terk eden müşteriye hatırlatma' },
  welcome:        { label: 'Hoş Geldin Serisi', icon: '👋', desc: 'Yeni kayıt olan müşteriye karşılama' },
  post_purchase:  { label: 'Satış Sonrası', icon: '📦', desc: 'Sipariş sonrası teşekkür / değerlendirme' },
  winback:        { label: 'Geri Kazanım', icon: '🔄', desc: 'Uzun süredir alışveriş yapmayan müşteri' },
  birthday:       { label: 'Doğum Günü', icon: '🎂', desc: 'Doğum gününde özel kupon' },
}

export interface RunResult {
  triggered: number
  sent: number
  failed: number
  message: string
}

/**
 * Bir akışı çalıştırır. Şu an gerçek tetikleyici verisi olan tek akış
 * abandoned_cart'tır (Shopify'dan terk edilmiş sepetleri çeker).
 * Diğer trigger'lar için demo/placeholder davranışı uygulanır.
 */
export async function runFlow(flowId: number): Promise<RunResult> {
  const flow = await prisma.automationFlow.findUnique({ where: { id: flowId } })
  if (!flow) return { triggered: 0, sent: 0, failed: 0, message: 'Akış bulunamadı' }
  if (!flow.enabled) return { triggered: 0, sent: 0, failed: 0, message: 'Akış pasif — önce aktifleştir' }

  let sent = 0, failed = 0, triggered = 0

  if (flow.trigger === 'abandoned_cart') {
    const { checkouts } = await getAbandonedCheckouts({ first: 50 })
    const targets = checkouts.filter(c => c.email)
    triggered = targets.length

    for (const c of targets) {
      const tpl = EmailTemplates.abandonedCart(
        c.customerName !== '—' ? c.customerName : 'Değerli Müşterimiz',
        c.abandonedCheckoutUrl || '#',
        `${c.totalPrice} ${c.currency}`
      )
      const subject = flow.subject || tpl.subject
      let html = flow.bodyTemplate || tpl.html
      if (flow.discountCode) {
        html = html.replace(/\{\{\s*discount\s*\}\}/g, flow.discountCode)
      }
      const r = await sendEmail({ to: c.email!, toName: c.customerName, subject, html })
      if (r.success) sent++; else failed++
      await new Promise(res => setTimeout(res, 80))
    }
  } else {
    // Henüz gerçek tetikleyici kaynağı bağlanmamış akışlar
    return {
      triggered: 0, sent: 0, failed: 0,
      message: `${TRIGGER_LABELS[flow.trigger]?.label ?? flow.trigger} akışı tanımlı. Otomatik tetikleme için cron/webhook bağlanmalı.`,
    }
  }

  await prisma.automationFlow.update({
    where: { id: flow.id },
    data: { lastRunAt: new Date(), sentCount: { increment: sent } },
  })

  return {
    triggered, sent, failed,
    message: `${triggered} hedef bulundu, ${sent} email gönderildi${failed ? `, ${failed} başarısız` : ''}.`,
  }
}

/** Varsayılan akış şablonları (ilk kurulumda oluşturmak için) */
export const DEFAULT_FLOWS = [
  { name: 'Sepet Hatırlatma (1 saat)', trigger: 'abandoned_cart', delayHours: 1,
    subject: '🛒 Sepetinde unuttuğun ürünler var!', discountCode: 'GERIDON10' },
  { name: 'Hoş Geldin', trigger: 'welcome', delayHours: 0,
    subject: 'Aramıza hoş geldin! 🎉', discountCode: 'HOSGELDIN10' },
  { name: 'Geri Kazanım (60 gün)', trigger: 'winback', delayHours: 0,
    subject: 'Seni özledik! 💔', discountCode: 'OZLEDIK15' },
]

/**
 * Cron için: çalışma zamanı gelmiş (lastRunAt yoksa veya delayHours kadar zaman geçmişse,
 * minimum 1 saat) etkin akışları çalıştırır. Aşırı tetiklemeyi önler.
 */
export async function runDueFlows(): Promise<{ ran: number; results: Array<{ id: number; name: string; message: string }> }> {
  const flows = await prisma.automationFlow.findMany({ where: { enabled: true } })
  const now = Date.now()
  const results: Array<{ id: number; name: string; message: string }> = []
  let ran = 0
  for (const f of flows) {
    const gapMs = Math.max(f.delayHours || 1, 1) * 60 * 60 * 1000
    if (f.lastRunAt && now - new Date(f.lastRunAt).getTime() < gapMs) continue
    try {
      const r = await runFlow(f.id)
      results.push({ id: f.id, name: f.name, message: r.message })
      ran++
    } catch (e: any) {
      results.push({ id: f.id, name: f.name, message: e?.message || 'hata' })
    }
  }
  return { ran, results }
}
