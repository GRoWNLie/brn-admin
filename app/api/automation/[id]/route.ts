import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAuditAuto } from '@/lib/audit'
import { runFlow } from '@/lib/automation'

// PATCH /api/automation/:id — güncelle (aktif/pasif, alanlar)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id, 10)
  const body = await req.json().catch(() => ({}))
  try {
    const data: any = {}
    if (typeof body.enabled === 'boolean') data.enabled = body.enabled
    if (body.name) data.name = String(body.name).slice(0, 120)
    if (typeof body.delayHours === 'number') data.delayHours = Math.max(0, Math.floor(body.delayHours))
    if (body.subject !== undefined) data.subject = body.subject ? String(body.subject).slice(0, 200) : null
    if (body.bodyTemplate !== undefined) data.bodyTemplate = body.bodyTemplate ? String(body.bodyTemplate) : null
    if (body.discountCode !== undefined) data.discountCode = body.discountCode ? String(body.discountCode).slice(0, 40) : null
    const flow = await prisma.automationFlow.update({ where: { id }, data })
    await logAuditAuto("automation.update", { req, resource: `automation:${id}`, detail: data })
    return NextResponse.json({ success: true, flow })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}

// DELETE /api/automation/:id
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id, 10)
  try {
    await prisma.automationFlow.delete({ where: { id } })
    await logAuditAuto("automation.delete", { req: _req, resource: `automation:${id}` })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}

// POST /api/automation/:id — "Şimdi Çalıştır"
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id, 10)
  try {
    const result = await runFlow(id)
    await logAuditAuto("automation.run", { req: _req, resource: `automation:${id}`, detail: { ...result } as Record<string, unknown> })
    return NextResponse.json({ success: true, ...result })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}
