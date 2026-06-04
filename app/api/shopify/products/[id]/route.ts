import { NextRequest, NextResponse } from 'next/server'
import { updateProduct, bulkUpdateVariants, setInventoryQuantity, deleteProduct } from '@/lib/shopify-mutations'
import { requirePermission } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

// DELETE /api/shopify/products/[id] — ürünü Shopify'dan sil
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requirePermission('products.delete')
  if (error) return error

  const productId = decodeURIComponent(params.id)
  try {
    const result = await deleteProduct(productId)
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.errors.map(e => e.message).join('; ') },
        { status: 400 }
      )
    }
    await logAudit({
      userId: user.id, userEmail: user.email!,
      action: 'products.delete', resource: `product:${productId}`, req,
    })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json(
      { success: false, message: e?.message || 'unknown' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/shopify/products/[id]
 *
 * Body: {
 *   product: { title?, vendor?, productType?, status?, descriptionHtml?, tags? }
 *   variants: [{
 *     id, price?, compareAtPrice?, sku?, barcode?,
 *     inventoryQuantity?, inventoryItemId?, locationId?
 *   }]
 * }
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requirePermission('products.edit')
  if (error) return error

  const body = await req.json().catch(() => ({}))
  const productId = decodeURIComponent(params.id)

  const errors: string[] = []
  let productUpdated = false
  let variantsUpdated = 0
  let inventoryUpdated = 0

  // 1) Ürün ana alanları
  if (body.product && Object.keys(body.product).length > 0) {
    try {
      const result = await updateProduct({ id: productId, ...body.product })
      if (result.success) {
        productUpdated = true
      } else {
        errors.push(...result.errors.map(e => `Ürün: ${e.message}`))
      }
    } catch (e: any) {
      errors.push(`Ürün güncellenirken hata: ${e?.message ?? 'bilinmeyen'}`)
    }
  }

  // 2) Varyantlar — bulk update (fiyat / sku / barkod / compareAt)
  if (Array.isArray(body.variants) && body.variants.length > 0) {
    const variantUpdates = body.variants
      .filter((v: any) => v.id)
      .map((v: any) => ({
        id: v.id,
        price: v.price,
        compareAtPrice: v.compareAtPrice,
        sku: v.sku,
        barcode: v.barcode,
      }))

    if (variantUpdates.length > 0) {
      try {
        const result = await bulkUpdateVariants(productId, variantUpdates)
        if (result.success) {
          variantsUpdated = variantUpdates.length
        } else {
          errors.push(...result.errors.map(e => `Varyant: ${e.message}`))
        }
      } catch (e: any) {
        errors.push(`Varyant güncelleme hatası: ${e?.message ?? 'bilinmeyen'}`)
      }
    }

    // 3) Her varyantın stoğunu ayrı ayrı güncelle
    for (const v of body.variants) {
      if (typeof v.inventoryQuantity !== 'number') continue
      if (!v.inventoryItemId || !v.locationId) {
        errors.push(`Stok: Varyant ${v.id} için inventoryItemId/locationId eksik`)
        continue
      }
      const stockRes = await setInventoryQuantity(v.inventoryItemId, v.locationId, v.inventoryQuantity)
      if (stockRes.success) {
        inventoryUpdated++
      } else if (stockRes.error) {
        errors.push(`Stok: ${stockRes.error}`)
      }
    }
  }

  await logAudit({
    userId: user.id, userEmail: user.email!,
    action: 'products.update', resource: `product:${productId}`,
    detail: { productUpdated, variantsUpdated, inventoryUpdated, hasErrors: errors.length > 0 },
    req,
  })

  return NextResponse.json({
    success: errors.length === 0,
    productUpdated,
    variantsUpdated,
    inventoryUpdated,
    errors,
  })
}
