import { NextRequest, NextResponse } from 'next/server'
import { addProductsToCollection, removeProductsFromCollection } from '@/lib/shopify-collections'
import { requirePermission } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

/** POST — koleksiyona ürün(ler) ekle */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requirePermission('collections.edit')
  if (error) return error

  const body = await req.json().catch(() => ({}))
  const productIds: string[] = body.productIds ?? []
  if (productIds.length === 0) {
    return NextResponse.json({ success: false, message: 'productIds gerekli' }, { status: 400 })
  }
  const id = decodeURIComponent(params.id)
  const result = await addProductsToCollection(id, productIds)
  if (!result.success) {
    return NextResponse.json({ success: false, message: result.errors.map((e: any) => e.message).join('; ') }, { status: 400 })
  }
  await logAudit({
    userId: user.id, userEmail: user.email!,
    action: 'collections.add_products', resource: `collection:${id}`,
    detail: { productCount: productIds.length }, req,
  })
  return NextResponse.json({ success: true })
}

/** DELETE — koleksiyondan ürün(ler) çıkar */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requirePermission('collections.edit')
  if (error) return error

  const body = await req.json().catch(() => ({}))
  const productIds: string[] = body.productIds ?? []
  if (productIds.length === 0) {
    return NextResponse.json({ success: false, message: 'productIds gerekli' }, { status: 400 })
  }
  const id = decodeURIComponent(params.id)
  const result = await removeProductsFromCollection(id, productIds)
  if (!result.success) {
    return NextResponse.json({ success: false, message: result.errors.map((e: any) => e.message).join('; ') }, { status: 400 })
  }
  await logAudit({
    userId: user.id, userEmail: user.email!,
    action: 'collections.remove_products', resource: `collection:${id}`,
    detail: { productCount: productIds.length }, req,
  })
  return NextResponse.json({ success: true })
}
