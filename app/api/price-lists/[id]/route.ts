import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAuditAuto } from '@/lib/audit'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}))
  try {
    const list = await prisma.priceList.update({
      where: { id: Number(params.id) },
      data: body,
    })
    await logAuditAuto("price_list.update", { req, resource: `price_list:${params.id}` })
    return NextResponse.json({ success: true, list })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.priceList.delete({ where: { id: Number(params.id) } })
    await logAuditAuto("price_list.delete", { req: _req, resource: `price_list:${params.id}` })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}
