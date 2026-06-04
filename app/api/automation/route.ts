import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAuditAuto } from '@/lib/audit'

// GET /api/automation — tüm akışlar
export async function GET() {
  try {
    const flows = await prisma.automationFlow.findMany({ orderBy: { createdAt: 'desc' } })
    return NextResponse.json({ success: true, flows })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}

// POST /api/automation — yeni akış
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  if (!body.name || !body.trigger) {
    return NextResponse.json({ success: false, message: 'name ve trigger gerekli' }, { status: 400 })
  }
  try {
    const flow = await prisma.automationFlow.create({
      data: {
        name: String(body.name).slice(0, 120),
        trigger: String(body.trigger),
        channel: body.channel === 'SMS' ? 'SMS' : 'EMAIL',
        enabled: !!body.enabled,
        delayHours: Number.isFinite(body.delayHours) ? Math.max(0, Math.floor(body.delayHours)) : 1,
        subject: body.subject ? String(body.subject).slice(0, 200) : null,
        bodyTemplate: body.bodyTemplate ? String(body.bodyTemplate) : null,
        discountCode: body.discountCode ? String(body.discountCode).slice(0, 40) : null,
      },
    })
    await logAuditAuto("automation.create", { req, resource: `automation:${flow.id}`, detail: { name: flow.name, trigger: flow.trigger } })
    return NextResponse.json({ success: true, flow })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}
