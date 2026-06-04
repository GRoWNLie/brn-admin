import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { corsJson, corsPreflight } from '@/lib/cors'

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req)
}

/**
 * GET /api/public/popup
 * Storefront widget aktif popup konfigürasyonunu çeker.
 * View sayacını artırır. Aktif popup yoksa { popup: null } döner.
 */
export async function GET(req: NextRequest) {
  try {
    const popup = await prisma.popup.findFirst({
      where: { enabled: true },
      orderBy: { createdAt: 'desc' },
    })
    if (!popup) return corsJson(req, { success: true, popup: null })

    // View say (await etme — yanıtı bekletmesin)
    prisma.popup.update({ where: { id: popup.id }, data: { views: { increment: 1 } } }).catch(() => {})

    return corsJson(req, {
      success: true,
      popup: {
        id: popup.id,
        headline: popup.headline,
        description: popup.description,
        buttonText: popup.buttonText,
        discountCode: popup.discountCode,
        imageUrl: popup.imageUrl,
        triggerType: popup.triggerType,
        triggerValue: popup.triggerValue,
        frequency: popup.frequency,
        position: popup.position,
        theme: popup.theme,
        collectEmail: popup.collectEmail,
      },
    })
  } catch (e: any) {
    return corsJson(req, { success: false, message: e?.message }, { status: 500 })
  }
}

/**
 * POST /api/public/popup
 * Body: { popupId, email? }
 * Email toplandığında lead kaydeder + conversion sayar.
 */
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  const popupId = parseInt(b.popupId, 10)
  if (!popupId) return corsJson(req, { success: false, message: 'popupId gerekli' }, { status: 400 })

  try {
    if (b.email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(b.email))) {
      await prisma.popupLead.create({
        data: { popupId, email: String(b.email).slice(0, 160) },
      })
    }
    await prisma.popup.update({ where: { id: popupId }, data: { conversions: { increment: 1 } } })
    return corsJson(req, { success: true, message: 'Teşekkürler!' })
  } catch (e: any) {
    return corsJson(req, { success: false, message: e?.message }, { status: 500 })
  }
}
