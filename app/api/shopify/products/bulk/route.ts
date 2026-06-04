import { NextRequest, NextResponse } from 'next/server'
import {
  updateProduct,
  deleteProduct,
  bulkUpdateVariants,
  setInventoryQuantity,
  getProductBulkInfo,
} from '@/lib/shopify-mutations'
import { requirePermission } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

type BulkAction =
  | 'delete'
  | 'set_status'
  | 'update_price'
  | 'update_stock'
  | 'add_tags'
  | 'remove_tags'

interface BulkBody {
  action: BulkAction
  productIds: string[]
  status?: 'ACTIVE' | 'DRAFT' | 'ARCHIVED'
  /** update_price için: yüzde-arttır / yüzde-azalt / sabit-fiyat */
  priceMode?: 'percent_increase' | 'percent_decrease' | 'fixed'
  priceValue?: number
  /** update_stock için: yeni stok değeri */
  stockValue?: number
  /** add_tags / remove_tags için */
  tags?: string[]
}

/** Yuvarlama: 2 ondalık, string */
function round2(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2)
}

/**
 * POST /api/shopify/products/bulk
 *
 * action:
 *   - delete                → ürünleri sil
 *   - set_status            → status değiştir (ACTIVE/DRAFT/ARCHIVED)
 *   - update_price          → tüm variantların fiyatını güncelle (yüzde/sabit)
 *   - update_stock          → tüm variantların stoğunu sabit değere getir
 *   - add_tags              → mevcut etiketlere ekle
 *   - remove_tags           → etiketleri çıkar
 */
export async function POST(req: NextRequest) {
  const { user, error } = await requirePermission('products.bulk')
  if (error) return error

  const body = (await req.json().catch(() => ({}))) as BulkBody
  const { action, productIds } = body

  if (!Array.isArray(productIds) || productIds.length === 0) {
    return NextResponse.json(
      { success: false, message: 'productIds array gerekli' },
      { status: 400 }
    )
  }

  let success = 0
  let failed = 0
  const errors: string[] = []

  for (const id of productIds) {
    try {
      const r = await runOne(id, body)
      if (r.ok) success++
      else { failed++; errors.push(`${shortId(id)}: ${r.message}`) }
    } catch (e: any) {
      failed++
      errors.push(`${shortId(id)}: ${e?.message ?? 'unknown'}`)
    }
  }

  await logAudit({
    userId: user.id, userEmail: user.email!,
    action: `products.bulk_${action}`,
    detail: {
      count: productIds.length, success, failed,
      ...(body.status ? { status: body.status } : {}),
      ...(body.priceMode ? { priceMode: body.priceMode, priceValue: body.priceValue } : {}),
      ...(body.stockValue !== undefined ? { stockValue: body.stockValue } : {}),
      ...(body.tags ? { tags: body.tags } : {}),
    },
    req,
  })

  return NextResponse.json({
    success: failed === 0,
    processedCount: productIds.length,
    successCount: success,
    failedCount: failed,
    errors: errors.slice(0, 10),
  })
}

function shortId(gid: string): string {
  return gid.replace('gid://shopify/Product/', '')
}

/** Tek ürün için bulk action çalıştırır */
async function runOne(id: string, b: BulkBody): Promise<{ ok: boolean; message?: string }> {
  switch (b.action) {
    case 'delete': {
      const r = await deleteProduct(id)
      return r.success
        ? { ok: true }
        : { ok: false, message: r.errors.map(e => e.message).join('; ') }
    }

    case 'set_status': {
      if (!b.status) return { ok: false, message: 'status eksik' }
      const r = await updateProduct({ id, status: b.status })
      return r.success
        ? { ok: true }
        : { ok: false, message: r.errors.map(e => e.message).join('; ') }
    }

    case 'update_price': {
      if (!b.priceMode || b.priceValue === undefined || b.priceValue === null) {
        return { ok: false, message: 'priceMode ve priceValue gerekli' }
      }
      const info = await getProductBulkInfo(id)
      if (!info) return { ok: false, message: 'ürün bulunamadı' }
      if (info.variants.length === 0) return { ok: false, message: 'varyant yok' }

      const value = Number(b.priceValue)
      if (isNaN(value)) return { ok: false, message: 'priceValue sayısal değil' }

      const newVariants = info.variants.map(v => {
        const old = parseFloat(v.price) || 0
        let next = old
        if (b.priceMode === 'percent_increase') next = old * (1 + value / 100)
        else if (b.priceMode === 'percent_decrease') next = old * (1 - value / 100)
        else next = value // fixed
        if (next < 0) next = 0
        return { id: v.id, price: round2(next) }
      })

      const r = await bulkUpdateVariants(id, newVariants)
      return r.success
        ? { ok: true }
        : { ok: false, message: r.errors.map(e => e.message).join('; ') }
    }

    case 'update_stock': {
      if (b.stockValue === undefined || b.stockValue === null) {
        return { ok: false, message: 'stockValue gerekli' }
      }
      const qty = Math.max(0, Math.floor(Number(b.stockValue)))
      if (isNaN(qty)) return { ok: false, message: 'stockValue sayısal değil' }

      const info = await getProductBulkInfo(id)
      if (!info) return { ok: false, message: 'ürün bulunamadı' }
      if (info.variants.length === 0) return { ok: false, message: 'varyant yok' }

      const errs: string[] = []
      for (const v of info.variants) {
        if (!v.inventoryItemId || !v.locationId) {
          errs.push('inventoryItem/location eksik')
          continue
        }
        const r = await setInventoryQuantity(v.inventoryItemId, v.locationId, qty)
        if (!r.success && r.error) errs.push(r.error)
      }
      return errs.length === 0
        ? { ok: true }
        : { ok: false, message: errs.join('; ') }
    }

    case 'add_tags': {
      const incoming = (b.tags ?? []).map(t => t.trim()).filter(Boolean)
      if (incoming.length === 0) return { ok: false, message: 'tags boş' }

      const info = await getProductBulkInfo(id)
      if (!info) return { ok: false, message: 'ürün bulunamadı' }

      const lowerSet = new Set(info.tags.map(t => t.toLowerCase()))
      const merged = [...info.tags]
      for (const t of incoming) {
        if (!lowerSet.has(t.toLowerCase())) {
          merged.push(t)
          lowerSet.add(t.toLowerCase())
        }
      }
      const r = await updateProduct({ id, tags: merged })
      return r.success
        ? { ok: true }
        : { ok: false, message: r.errors.map(e => e.message).join('; ') }
    }

    case 'remove_tags': {
      const incoming = (b.tags ?? []).map(t => t.trim().toLowerCase()).filter(Boolean)
      if (incoming.length === 0) return { ok: false, message: 'tags boş' }

      const info = await getProductBulkInfo(id)
      if (!info) return { ok: false, message: 'ürün bulunamadı' }

      const next = info.tags.filter(t => !incoming.includes(t.toLowerCase()))
      const r = await updateProduct({ id, tags: next })
      return r.success
        ? { ok: true }
        : { ok: false, message: r.errors.map(e => e.message).join('; ') }
    }

    default:
      return { ok: false, message: 'bilinmeyen action' }
  }
}
