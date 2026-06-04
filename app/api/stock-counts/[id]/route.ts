import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { logAuditAuto } from '@/lib/audit'
import { setInventoryQuantity } from '@/lib/shopify-mutations'

// GET /api/stock-counts/[id] — tek sayım + kalemleri
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  try {
    const count = await prisma.stockCount.findUnique({
      where: { id },
      include: { items: { orderBy: { countedAt: 'desc' } } },
    })
    if (!count) return NextResponse.json({ success: false, message: 'Sayım bulunamadı' }, { status: 404 })
    return NextResponse.json({ success: true, count })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}

/**
 * PATCH /api/stock-counts/[id]
 * Body: { action: 'submit' | 'approve' | 'reject' | 'cancel' | 'reopen', notes? }
 *  - submit  : IN_PROGRESS → PENDING_APPROVAL (sayımı onaya gönder)
 *  - approve : PENDING_APPROVAL → COMPLETED (SADECE ADMIN; sayılanları Shopify'a yazar)
 *  - reject  : PENDING_APPROVAL → IN_PROGRESS (geri gönder)
 *  - cancel  : → CANCELLED
 *  - reopen  : COMPLETED/CANCELLED → IN_PROGRESS
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  const body = await req.json().catch(() => ({}))
  const action = body.action as string

  const count = await prisma.stockCount.findUnique({ where: { id }, include: { items: true } })
  if (!count) return NextResponse.json({ success: false, message: 'Sayım bulunamadı' }, { status: 404 })

  try {
    if (action === 'submit') {
      if (count.status !== 'IN_PROGRESS') {
        return NextResponse.json({ success: false, message: 'Sadece devam eden sayım gönderilebilir' }, { status: 400 })
      }
      if (count.items.length === 0) {
        return NextResponse.json({ success: false, message: 'Boş sayım gönderilemez' }, { status: 400 })
      }
      const updated = await prisma.stockCount.update({
        where: { id },
        data: { status: 'PENDING_APPROVAL', submittedAt: new Date() },
      })
      await logAuditAuto('stock_count.submit', {
        req, resource: `stock_count:${id}`,
        detail: { countNumber: count.countNumber, itemCount: count.items.length },
      })
      return NextResponse.json({ success: true, count: updated })
    }

    if (action === 'reject') {
      if (count.status !== 'PENDING_APPROVAL') {
        return NextResponse.json({ success: false, message: 'Sadece onay bekleyen sayım reddedilebilir' }, { status: 400 })
      }
      const updated = await prisma.stockCount.update({
        where: { id },
        data: { status: 'IN_PROGRESS', submittedAt: null },
      })
      await logAuditAuto('stock_count.reject', { req, resource: `stock_count:${id}`, detail: { countNumber: count.countNumber } })
      return NextResponse.json({ success: true, count: updated })
    }

    if (action === 'cancel') {
      const updated = await prisma.stockCount.update({ where: { id }, data: { status: 'CANCELLED' } })
      await logAuditAuto('stock_count.cancel', { req, resource: `stock_count:${id}`, detail: { countNumber: count.countNumber } })
      return NextResponse.json({ success: true, count: updated })
    }

    if (action === 'reopen') {
      const updated = await prisma.stockCount.update({
        where: { id },
        data: { status: 'IN_PROGRESS', completedAt: null, submittedAt: null },
      })
      await logAuditAuto('stock_count.reopen', { req, resource: `stock_count:${id}`, detail: { countNumber: count.countNumber } })
      return NextResponse.json({ success: true, count: updated })
    }

    if (action === 'approve') {
      // SADECE ADMIN
      const user = await getCurrentUser()
      if (!user) return NextResponse.json({ success: false, message: 'Oturum yok' }, { status: 401 })
      if (user.role !== 'ADMIN') {
        return NextResponse.json({ success: false, message: 'Sadece ADMIN onaylayabilir' }, { status: 403 })
      }
      if (count.status !== 'PENDING_APPROVAL') {
        return NextResponse.json({ success: false, message: 'Sadece onay bekleyen sayım onaylanabilir' }, { status: 400 })
      }

      // Sayılan miktarları Shopify'a yaz (inventoryItemId olan kalemler)
      const results: Array<{ title: string; ok: boolean; error?: string }> = []
      let applied = 0, skipped = 0
      for (const item of count.items) {
        if (!item.inventoryItemId) {
          skipped++
          results.push({ title: item.title, ok: false, error: 'Shopify varyantı bağlı değil (elle eklenmiş)' })
          continue
        }
        const r = await setInventoryQuantity(item.inventoryItemId, count.locationId, item.counted)
        if (r.success) { applied++; results.push({ title: item.title, ok: true }) }
        else { results.push({ title: item.title, ok: false, error: r.error }) }
        await new Promise(res => setTimeout(res, 60))
      }

      const updated = await prisma.stockCount.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          approvedAt: new Date(),
          approvedBy: user.name || user.email || 'ADMIN',
          appliedToShopify: true,
          completedAt: new Date(),
        },
      })
      await logAuditAuto('stock_count.approve', {
        req, resource: `stock_count:${id}`,
        detail: {
          countNumber: count.countNumber, location: count.locationName,
          itemCount: count.items.length, appliedToShopify: applied, skipped,
          diffPositive: count.diffPositive, diffNegative: count.diffNegative,
        },
      })
      return NextResponse.json({
        success: true, count: updated,
        applied, skipped, results,
        message: `${applied} kalem Shopify'a yazıldı${skipped ? `, ${skipped} kalem atlandı (varyant bağlı değil)` : ''}.`,
      })
    }

    return NextResponse.json({ success: false, message: 'Geçersiz action' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}
