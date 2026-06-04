import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAuditAuto } from '@/lib/audit'

async function recomputeTotals(countId: number) {
  const all = await prisma.stockCountItem.findMany({ where: { countId } })
  const diffPositive = all.filter(i => i.diff > 0).reduce((s, i) => s + i.diff, 0)
  const diffNegative = all.filter(i => i.diff < 0).reduce((s, i) => s + Math.abs(i.diff), 0)
  await prisma.stockCount.update({
    where: { id: countId },
    data: { itemCount: all.length, diffPositive, diffNegative },
  })
}

// PATCH /api/stock-counts/[id]/items/[itemId] — Body: { counted?, location? }
export async function PATCH(req: NextRequest, { params }: { params: { id: string; itemId: string } }) {
  const countId = Number(params.id)
  const itemId = Number(params.itemId)
  const body = await req.json().catch(() => ({}))
  try {
    const existing = await prisma.stockCountItem.findUnique({ where: { id: itemId } })
    if (!existing) return NextResponse.json({ success: false, message: 'Kalem bulunamadı' }, { status: 404 })

    const counted = body.counted !== undefined ? Number(body.counted) : existing.counted
    const location = body.location !== undefined
      ? (String(body.location).trim().slice(0, 60) || null)
      : existing.location

    const item = await prisma.stockCountItem.update({
      where: { id: itemId },
      data: { counted, diff: counted - existing.expected, location },
    })

    if (location && existing.sku) {
      await prisma.binLocation.upsert({
        where: { sku: existing.sku },
        create: { sku: existing.sku, location, title: existing.title },
        update: { location, title: existing.title },
      }).catch(() => {})
    }

    await recomputeTotals(countId)
    await logAuditAuto('stock_count.item_update', {
      req, resource: `stock_count:${countId}`,
      detail: { itemId, title: existing.title, counted, location },
    })
    return NextResponse.json({ success: true, item })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}

// DELETE /api/stock-counts/[id]/items/[itemId]
export async function DELETE(_req: NextRequest, { params }: { params: { id: string; itemId: string } }) {
  const countId = Number(params.id)
  const itemId = Number(params.itemId)
  try {
    await prisma.stockCountItem.delete({ where: { id: itemId } })
    await recomputeTotals(countId)
    await logAuditAuto('stock_count.item_delete', { req: _req, resource: `stock_count:${countId}`, detail: { itemId } })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}
