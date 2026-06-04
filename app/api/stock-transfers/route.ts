import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAuditAuto } from '@/lib/audit'

function generateTransferNumber() {
  return `TR-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`
}

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get('status')
  try {
    const transfers = await prisma.stockTransfer.findMany({
      where: status ? { status } : {},
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return NextResponse.json({ success: true, transfers })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  if (!body.fromLocationId || !body.toLocationId || !Array.isArray(body.items)) {
    return NextResponse.json({ success: false, message: 'from/to/items gerekli' }, { status: 400 })
  }
  try {
    const transfer = await prisma.stockTransfer.create({
      data: {
        transferNumber: generateTransferNumber(),
        fromLocationId: body.fromLocationId,
        fromLocationName: body.fromLocationName || body.fromLocationId,
        toLocationId: body.toLocationId,
        toLocationName: body.toLocationName || body.toLocationId,
        status: 'DRAFT',
        notes: body.notes,
        items: {
          create: body.items.map((it: any) => ({
            title: it.title, sku: it.sku, quantity: Number(it.quantity),
            shopifyVariantId: it.shopifyVariantId,
            inventoryItemId: it.inventoryItemId,
          })),
        },
      },
      include: { items: true },
    })
    await logAuditAuto("stock_transfer.create", { req, resource: `stock_transfer:${transfer.id}` })
    return NextResponse.json({ success: true, transfer })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}
