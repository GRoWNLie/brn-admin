import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAuditAuto } from '@/lib/audit'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}))
  try {
    const t = await prisma.stockTransfer.update({
      where: { id: Number(params.id) },
      data: {
        status: body.status,
        shippedAt: body.status === 'IN_TRANSIT' ? new Date() : undefined,
        receivedAt: body.status === 'RECEIVED' ? new Date() : undefined,
      },
    })
    await logAuditAuto("stock_transfer.update", { req, resource: `stock_transfer:${params.id}` })
    return NextResponse.json({ success: true, transfer: t })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.stockTransfer.delete({ where: { id: Number(params.id) } })
    await logAuditAuto("stock_transfer.delete", { req: _req, resource: `stock_transfer:${params.id}` })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}
