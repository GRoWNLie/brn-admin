import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAuditAuto } from '@/lib/audit'

const ALLOWED = ['name', 'headline', 'description', 'buttonText', 'discountCode', 'imageUrl',
  'triggerType', 'triggerValue', 'frequency', 'position', 'theme', 'collectEmail', 'enabled']

// PATCH /api/popups/:id
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id, 10)
  const b = await req.json().catch(() => ({}))
  try {
    const data: any = {}
    for (const k of ALLOWED) if (b[k] !== undefined) data[k] = b[k]
    if (data.triggerValue !== undefined) data.triggerValue = Math.max(0, Math.floor(Number(data.triggerValue) || 0))
    const popup = await prisma.popup.update({ where: { id }, data })
    await logAuditAuto("popup.update", { req, resource: `popup:${id}`, detail: data })
    return NextResponse.json({ success: true, popup })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}

// DELETE /api/popups/:id
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id, 10)
  try {
    await prisma.popup.delete({ where: { id } })
    await logAuditAuto("popup.delete", { req: _req, resource: `popup:${id}` })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}

// GET /api/popups/:id — tekil + son leadler
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id, 10)
  try {
    const popup = await prisma.popup.findUnique({
      where: { id },
      include: { leads: { orderBy: { createdAt: 'desc' }, take: 100 } },
    })
    if (!popup) return NextResponse.json({ success: false, message: 'Bulunamadı' }, { status: 404 })
    return NextResponse.json({ success: true, popup })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}
