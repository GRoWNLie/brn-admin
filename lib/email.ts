/**
 * Email gönderim modülü — Resend API üzerinden.
 *
 * .env'ye eklenmesi gereken:
 *   RESEND_API_KEY=re_xxxxx
 *   EMAIL_FROM="BRN Admin <hello@yourdomain.com>"
 *
 * API key yoksa MOCK modda çalışır (sadece DB'ye log düşer, gerçek mail gitmez).
 */

import { prisma } from './prisma'
import { getSetting } from './app-settings'

export interface SendEmailInput {
  to: string | string[]
  subject: string
  html: string
  text?: string
  campaignId?: number
  toName?: string
}

export interface SendEmailResult {
  success: boolean
  resendId?: string
  error?: string
  mocked?: boolean
}

/**
 * Tek email gönderir. Resend yoksa mock'lar (DB'ye log + console).
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const toEmail = Array.isArray(input.to) ? input.to[0] : input.to
  const RESEND_API_KEY = await getSetting('RESEND_API_KEY')
  const EMAIL_FROM = (await getSetting('EMAIL_FROM')) || 'BRN Admin <onboarding@resend.dev>'

  // Resend yapılandırılmamışsa MOCK
  if (!RESEND_API_KEY) {
    console.log(`📧 [MOCK] Email gönderildi varsayıldı: ${toEmail} - "${input.subject}"`)
    await prisma.emailLog.create({
      data: {
        campaignId: input.campaignId ?? null,
        toEmail,
        toName: input.toName,
        subject: input.subject,
        status: 'SENT',
        resendId: `mock_${Date.now()}`,
      },
    })
    return { success: true, mocked: true, resendId: `mock_${Date.now()}` }
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      await prisma.emailLog.create({
        data: {
          campaignId: input.campaignId ?? null,
          toEmail, toName: input.toName, subject: input.subject,
          status: 'FAILED', errorMsg: errText.slice(0, 500),
        },
      })
      return { success: false, error: `Resend ${res.status}: ${errText}` }
    }

    const data = await res.json()
    await prisma.emailLog.create({
      data: {
        campaignId: input.campaignId ?? null,
        toEmail, toName: input.toName, subject: input.subject,
        status: 'SENT', resendId: data.id,
      },
    })
    return { success: true, resendId: data.id }
  } catch (e: any) {
    await prisma.emailLog.create({
      data: {
        campaignId: input.campaignId ?? null,
        toEmail, toName: input.toName, subject: input.subject,
        status: 'FAILED', errorMsg: e?.message?.slice(0, 500),
      },
    })
    return { success: false, error: e?.message ?? 'unknown' }
  }
}

/**
 * Toplu email — segment veya manuel liste için.
 * Resend'in rate-limit'ine takılmamak için 100ms delay ile sıralı gönderir.
 */
export async function sendBulkEmail(
  recipients: Array<{ email: string; name?: string; vars?: Record<string, string> }>,
  subject: string,
  htmlTemplate: string,
  campaignId?: number
): Promise<{ sent: number; failed: number; errors: string[] }> {
  let sent = 0, failed = 0
  const errors: string[] = []

  for (const r of recipients) {
    // Variable substitution: {{name}}, {{email}}, vs.
    const vars = { name: r.name ?? '', email: r.email, ...(r.vars ?? {}) }
    let html = htmlTemplate
    for (const [k, v] of Object.entries(vars)) {
      html = html.replace(new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, 'g'), String(v))
    }

    const result = await sendEmail({
      to: r.email, toName: r.name, subject, html, campaignId,
    })
    if (result.success) sent++
    else { failed++; if (errors.length < 10) errors.push(`${r.email}: ${result.error}`) }

    await new Promise(res => setTimeout(res, 100)) // rate-limit korumalı
  }

  return { sent, failed, errors }
}

// =========================================================
//                     TEMPLATES
// =========================================================

export const EmailTemplates = {
  welcome: (name: string) => ({
    subject: `Hoş geldin ${name}!`,
    html: `
      <div style="font-family: Helvetica, sans-serif; max-width: 580px; margin: 0 auto;">
        <h1 style="color: #0F172A;">Hoş geldin, ${name}! 🎉</h1>
        <p>SekerCo mağazasına kaydınız başarıyla oluşturuldu.</p>
        <p>İlk siparişinde <strong>%10 indirim</strong> için <code>HOSGELDIN10</code> kuponunu kullanabilirsin.</p>
        <a href="https://sekerco.com" style="display: inline-block; background: #0F172A; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 14px;">Alışverişe Başla →</a>
      </div>
    `,
  }),

  abandonedCart: (name: string, recoveryUrl: string, total: string) => ({
    subject: '🛒 Sepetinde unuttuğun ürünler var!',
    html: `
      <div style="font-family: Helvetica, sans-serif; max-width: 580px; margin: 0 auto;">
        <h2 style="color: #DC2626;">Merhaba ${name}!</h2>
        <p>Sepetinde <strong>${total}</strong> tutarında ürün var ve henüz tamamlamamışsın.</p>
        <p>Sınırlı süre — ürünlerin tükenebilir!</p>
        <a href="${recoveryUrl}" style="display: inline-block; background: #DC2626; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 14px;">Sepete Geri Dön →</a>
        <p style="margin-top: 20px; color: #6B7280; font-size: 12px;">Bu kampanya 24 saat geçerlidir.</p>
      </div>
    `,
  }),

  orderConfirmation: (name: string, orderName: string, total: string) => ({
    subject: `Sipariş alındı: ${orderName} ✅`,
    html: `
      <div style="font-family: Helvetica, sans-serif; max-width: 580px; margin: 0 auto;">
        <h2 style="color: #059669;">Teşekkürler, ${name}! 🎉</h2>
        <p>${orderName} numaralı siparişin başarıyla alındı.</p>
        <p><strong>Toplam:</strong> ${total}</p>
        <p>Siparişiniz hazırlanıyor. Kargoya verildiğinde takip numarası ile bilgilendirileceksiniz.</p>
      </div>
    `,
  }),

  shippingNotification: (name: string, orderName: string, trackingCompany: string, trackingNumber: string, trackingUrl: string) => ({
    subject: `🚚 Siparişin kargoya verildi: ${orderName}`,
    html: `
      <div style="font-family: Helvetica, sans-serif; max-width: 580px; margin: 0 auto;">
        <h2 style="color: #2563EB;">Sipariş Kargoda 🚚</h2>
        <p>Merhaba ${name},</p>
        <p>${orderName} numaralı siparişin <strong>${trackingCompany}</strong> ile kargoya verildi.</p>
        <p><strong>Takip No:</strong> ${trackingNumber}</p>
        ${trackingUrl ? `<a href="${trackingUrl}" style="display: inline-block; background: #2563EB; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 14px;">Kargo Takip →</a>` : ''}
      </div>
    `,
  }),

  vipOffer: (name: string, discountCode: string, percent: number) => ({
    subject: `🎁 ${name}, sana özel ${percent}% indirim!`,
    html: `
      <div style="font-family: Helvetica, sans-serif; max-width: 580px; margin: 0 auto;">
        <h2 style="color: #7C3AED;">VIP Müşterimize Özel 👑</h2>
        <p>Merhaba ${name},</p>
        <p>En değerli müşterilerimizden birisin. Sana özel bir kupon hazırladık:</p>
        <div style="background: #F5F3FF; border: 2px dashed #7C3AED; padding: 20px; text-align: center; border-radius: 10px; margin: 20px 0;">
          <div style="font-size: 12px; color: #6D28D9;">İndirim Kodu</div>
          <div style="font-size: 28px; font-weight: bold; color: #7C3AED; letter-spacing: 2px;">${discountCode}</div>
          <div style="font-size: 14px; color: #6D28D9;">${percent}% İNDİRİM</div>
        </div>
      </div>
    `,
  }),
}
