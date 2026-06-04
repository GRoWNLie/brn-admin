import { NextRequest, NextResponse } from 'next/server'
import { createProduct } from '@/lib/shopify-mutations'
import { getProducts } from '@/lib/shopify-data'
import { requirePermission } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

// GET /api/shopify/products — ürün listesi (arama desteğiyle)
export async function GET(req: NextRequest) {
  const { error } = await requirePermission('products.view')
  if (error) return error

  const sp = req.nextUrl.searchParams
  try {
    const result = await getProducts({
      first: Math.min(parseInt(sp.get('first') || '25', 10), 100),
      after: sp.get('after') || null,
      search: sp.get('search') || undefined,
    })
    return NextResponse.json({ success: true, ...result })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}

// POST /api/shopify/products — yeni ürün oluştur
export async function POST(req: NextRequest) {
  const { user, error } = await requirePermission('products.edit')
  if (error) return error

  const body = await req.json().catch(() => ({}))

  if (!body.title || !body.title.trim()) {
    return NextResponse.json(
      { success: false, message: 'Başlık zorunludur' },
      { status: 400 }
    )
  }

  try {
    const result = await createProduct({
      title: body.title,
      descriptionHtml: body.descriptionHtml,
      vendor: body.vendor,
      productType: body.productType,
      status: body.status,
      tags: body.tags,
      imageUrls: body.imageUrls,
      price: body.price,
      sku: body.sku,
      inventoryQuantity: body.inventoryQuantity,
    })

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.errors.map(e => e.message).join('; ') },
        { status: 400 }
      )
    }

    await logAudit({
      userId: user.id, userEmail: user.email!,
      action: 'products.create',
      resource: result.productId ? `product:${result.productId}` : null,
      detail: { title: body.title, status: body.status ?? 'DRAFT' },
      req,
    })

    return NextResponse.json({
      success: true,
      productId: result.productId,
      variantId: result.variantId,
    })
  } catch (e: any) {
    return NextResponse.json(
      { success: false, message: e?.message || 'unknown' },
      { status: 500 }
    )
  }
}
