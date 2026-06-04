import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAuditAuto } from '@/lib/audit'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const order = await prisma.purchaseOrder.findUnique({
      where: { id: Number(params.id) },
      include: { items: true, supplier: true },
    })
    if (!order) return NextResponse.json({ success: false, message: 'Bulunamadı' }, { status: 404 })
    return NextResponse.json({ success: true, order })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}))
  try {
    const order = await prisma.purchaseOrder.update({
      where: { id: Number(params.id) },
      data: {
        status: body.status,
        notes: body.notes,
        receivedAt: body.status === 'RECEIVED' ? new Date() : undefined,
      },
    })
    await logAuditAuto("purchase_order.update", { req, resource: `purchase_order:${params.id}`, detail: { status: body.status } })
    return NextResponse.json({ success: true, order })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.purchaseOrder.delete({ where: { id: Number(params.id) } })
    await logAuditAuto("purchase_order.delete", { req: _req, resource: `purchase_order:${params.id}` })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}
