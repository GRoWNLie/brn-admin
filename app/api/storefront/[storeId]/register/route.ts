import { NextRequest, NextResponse } from 'next/server'
import { createShopifyCustomer } from '@/lib/shopify-store-client'
import { createSession } from '@/lib/storefront-session'
import { rateLimit, clientIp } from '@/lib/rate-limit'
import { awardPoints, getLoyaltySettings } from '@/lib/loyalty'
import { sendEmail } from '@/lib/email'

/**
 * POST /api/storefront/[storeId]/register
 * Body: { firstName, lastName, email, phone?, password, kvkk, marketing? }
 *
 * Akış:
 *   1) Validation + rate limit
 *   2) Shopify'a customerCreate (mail/SMS marketing consent ile)
 *   3) Storefront session başlat (cookie)
 *   4) Sadakat: kayıt bonusu (signupBonus ayarındaysa)
 *   5) Hoş geldin maili (Resend tanımlıysa)
 */
export async function POST(req: NextRequest, { params }: { params: { storeId: string } }) {
  const storeId = Number(params.storeId)
  const rl = rateLimit(`sf_register:${clientIp(req)}:${storeId}`, 5, 60_000)
  if (!rl.ok) return NextResponse.json({ success: false, message: `Çok fazla deneme, ${Math.ceil(rl.resetIn / 1000)}sn sonra tekrar deneyin.` }, { status: 429 })

  const b = await req.json().catch(() => ({}))
  const firstName = String(b.firstName || '').trim().slice(0, 60)
  const lastName = String(b.lastName || '').trim().slice(0, 60)
  const email = String(b.email || '').trim().toLowerCase()
  const phone = b.phone ? String(b.phone).trim().slice(0, 30) : null
  const password = String(b.password || '')
  const marketing = !!b.marketing

  if (!firstName || !lastName) return NextResponse.json({ success: false, message: 'Ad ve soyad gerekli' }, { status: 400 })
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ success: false, message: 'Geçerli e-posta gerekli' }, { status: 400 })
  if (password.length < 6) return NextResponse.json({ success: false, message: 'Şifre en az 6 karakter olmalı' }, { status: 400 })
  if (!b.kvkk) return NextResponse.json({ success: false, message: 'KVKK onayı gerekli' }, { status: 400 })

  const r = await createShopifyCustomer(storeId, {
    firstName, lastName, email, phone, password,
    acceptsMarketing: marketing, smsMarketing: marketing && !!phone,
    tags: ['storefront', 'customer-dashboard'],
    note: `Storefront kayıt — ${new Date().toISOString()}`,
  })
  if (!r.ok) return NextResponse.json({ success: false, message: r.message, alreadyExists: r.alreadyExists }, { status: r.alreadyExists ? 409 : 400 })

  const customerId = r.customer!.id
  await createSession(storeId, customerId)

  // Sadakat kayıt bonusu (signupBonus > 0 ise otomatik atanır — getOrCreateAccount içinde)
  try {
    const s = await getLoyaltySettings()
    if (s.signupBonus > 0) {
      await awardPoints(customerId, { orderTotal: 0, email, name: `${firstName} ${lastName}` })
    }
  } catch {}

  // Hoş geldin e-postası (Resend tanımlıysa gerçek, yoksa MOCK)
  try {
    await sendEmail({
      to: email, toName: `${firstName} ${lastName}`,
      subject: 'Hoş geldin! 🎉',
      html: `<div style="font-family:sans-serif;max-width:520px"><h2>Hoş geldin ${firstName}!</h2><p>Hesabın oluşturuldu. Artık siparişlerini ve özel tekliflerini takip edebilirsin.</p></div>`,
    })
  } catch {}

  return NextResponse.json({ success: true, customerId, message: r.message })
}
