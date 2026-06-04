import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAuditAuto } from '@/lib/audit'

function generatePONumber() {
  const year = new Date().getFullYear()
  const ts = Date.now().toString().slice(-6)
  return `PO-${year}-${ts}`
}

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get('status')
  try {
    const orders = await prisma.purchaseOrder.findMany({
      where: status ? { status } : {},
      include: { supplier: true, items: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return NextResponse.json({ success: true, orders })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  if (!body.supplierId || !Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ success: false, message: 'supplierId + items gerekli' }, { status: 400 })
  }
  try {
    const total = body.items.reduce(
      (s: number, it: any) => s + (Number(it.quantity) || 0) * (Number(it.unitCost) || 0), 0
    )
    const order = await prisma.purchaseOrder.create({
      data: {
        poNumber: generatePONumber(),
        supplierId: Number(body.supplierId),
        status: body.status || 'DRAFT',
        notes: body.notes,
        expectedAt: body.expectedAt ? new Date(body.expectedAt) : null,
        totalAmount: total,
        items: {
          create: body.items.map((it: any) => ({
            title: it.title,
            sku: it.sku,
            quantity: Number(it.quantity),
            unitCost: Number(it.unitCost),
            shopifyProductId: it.shopifyProductId,
            shopifyVariantId: it.shopifyVariantId,
          })),
        },
      },
      include: { items: true, supplier: true },
    })
    await logAuditAuto("purchase_order.create", { req, resource: `purchase_order:${order.id}` })
    return NextResponse.json({ success: true, order })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}
