import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { corsJson, corsPreflight } from '@/lib/cors'

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req)
}

/**
 * POST /api/public/cart-track
 * Body: { cartToken, customerEmail?, customerId?, items:[{title,quantity,price,image,sku}], total, currency }
 * Storefront cart-tracker.js çağırır. Üye müşterinin canlı sepetini DB'de tutar.
 */
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  const id = typeof b.cartToken === 'string' ? b.cartToken.slice(0, 100) : ''
  if (!id) return corsJson(req, { success: false, message: 'cartToken gerekli' }, { status: 400 })

  const items = Array.isArray(b.items) ? b.items.slice(0, 100).map((i: any) => ({
    title: String(i.title || '').slice(0, 200),
    quantity: Number(i.quantity) || 0,
    price: Number(i.price) || 0,
    image: i.image ? String(i.image).slice(0, 500) : null,
    sku: i.sku ? String(i.sku).slice(0, 80) : null,
  })) : []
  const itemCount = items.reduce((s: number, i: any) => s + i.quantity, 0)

  try {
    // Boş sepet → kaydı sil
    if (itemCount === 0) {
      await prisma.cartSession.deleteMany({ where: { id } })
      return corsJson(req, { success: true, cleared: true })
    }
    const data = {
      customerEmail: b.customerEmail ? String(b.customerEmail).slice(0, 160) : null,
      customerId: b.customerId ? String(b.customerId).slice(0, 60) : null,
      items: JSON.stringify(items),
      itemCount,
      total: Number(b.total) || 0,
      currency: b.currency ? String(b.currency).slice(0, 8) : 'TRY',
    }
    await prisma.cartSession.upsert({ where: { id }, create: { id, ...data }, update: data })

    // 7 günden eski sepetleri ara sıra temizle
    if (Math.random() < 0.02) {
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      prisma.cartSession.deleteMany({ where: { updatedAt: { lt: cutoff } } }).catch(() => {})
    }
    return corsJson(req, { success: true })
  } catch (e: any) {
    return corsJson(req, { success: false, message: e?.message }, { status: 500 })
  }
}
