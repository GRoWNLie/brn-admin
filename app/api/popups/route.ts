import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAuditAuto } from '@/lib/audit'

// GET /api/popups — tüm popuplar
export async function GET() {
  try {
    const popups = await prisma.popup.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { leads: true } } },
    })
    return NextResponse.json({ success: true, popups })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}

// POST /api/popups — yeni popup
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  if (!b.name || !b.headline) {
    return NextResponse.json({ success: false, message: 'name ve headline gerekli' }, { status: 400 })
  }
  try {
    const popup = await prisma.popup.create({
      data: {
        name: String(b.name).slice(0, 120),
        headline: String(b.headline).slice(0, 200),
        description: b.description ? String(b.description) : null,
        buttonText: b.buttonText ? String(b.buttonText).slice(0, 60) : 'Kupon Al',
        discountCode: b.discountCode ? String(b.discountCode).slice(0, 40) : null,
        imageUrl: b.imageUrl ? String(b.imageUrl) : null,
        triggerType: ['delay', 'exit_intent', 'scroll'].includes(b.triggerType) ? b.triggerType : 'delay',
        triggerValue: Number.isFinite(b.triggerValue) ? Math.max(0, Math.floor(b.triggerValue)) : 5,
        frequency: ['once', 'session', 'always'].includes(b.frequency) ? b.frequency : 'once',
        position: b.position === 'bottom-right' ? 'bottom-right' : 'center',
        theme: b.theme === 'dark' ? 'dark' : 'light',
        collectEmail: b.collectEmail !== false,
        enabled: !!b.enabled,
      },
    })
    await logAuditAuto("popup.create", { req, resource: `popup:${popup.id}`, detail: { name: popup.name } })
    return NextResponse.json({ success: true, popup })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}
