import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAuditAuto } from '@/lib/audit'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}))
  try {
    const rule = await prisma.upsellRule.update({
      where: { id: Number(params.id) },
      data: body,
    })
    await logAuditAuto("upsell.update", { req, resource: `upsell:${params.id}` })
    return NextResponse.json({ success: true, rule })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.upsellRule.delete({ where: { id: Number(params.id) } })
    await logAuditAuto("upsell.delete", { req: _req, resource: `upsell:${params.id}` })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}
