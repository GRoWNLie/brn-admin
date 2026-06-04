import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAuditAuto } from '@/lib/audit'

// POST /api/stock-counts/[id]/items
// Body: { title, sku?, barcode?, location?, expected, counted, shopifyVariantId?, inventoryItemId? }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}))
  const countId = Number(params.id)
  try {
    const expected = Number(body.expected || 0)
    const counted = Number(body.counted || 0)
    const location = typeof body.location === 'string' ? body.location.trim().slice(0, 60) : ''
    const item = await prisma.stockCountItem.create({
      data: {
        countId,
        title: body.title || '—',
        sku: body.sku, barcode: body.barcode,
        location: location || null,
        expected, counted, diff: counted - expected,
        shopifyVariantId: body.shopifyVariantId,
        inventoryItemId: body.inventoryItemId,
      },
    })

    // Raf lokasyonu girildiyse SKU bazlı kalıcı kaydı güncelle (ürünler/sipariş ekranında görünür)
    if (location && body.sku) {
      await prisma.binLocation.upsert({
        where: { sku: String(body.sku) },
        create: { sku: String(body.sku), location, title: body.title || null },
        update: { location, title: body.title || null },
      }).catch(() => {})
    }

    // Sayım özet rakamlarını güncelle
    const all = await prisma.stockCountItem.findMany({ where: { countId } })
    const diffPositive = all.filter(i => i.diff > 0).reduce((s, i) => s + i.diff, 0)
    const diffNegative = all.filter(i => i.diff < 0).reduce((s, i) => s + Math.abs(i.diff), 0)
    await prisma.stockCount.update({
      where: { id: countId },
      data: { itemCount: all.length, diffPositive, diffNegative },
    })

    await logAuditAuto('stock_count.item_add', {
      req, resource: `stock_count:${countId}`,
      detail: { title: item.title, sku: item.sku, location: item.location, expected, counted, diff: item.diff },
    })

    return NextResponse.json({ success: true, item })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}
