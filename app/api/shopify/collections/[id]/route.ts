import { NextRequest, NextResponse } from 'next/server'
import { getCollectionDetail, updateCollection, deleteCollection } from '@/lib/shopify-collections'
import { requirePermission } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission('collections.view')
  if (error) return error

  try {
    const detail = await getCollectionDetail(decodeURIComponent(params.id))
    if (!detail) return NextResponse.json({ success: false, message: 'Bulunamadı' }, { status: 404 })
    return NextResponse.json({ success: true, collection: detail })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requirePermission('collections.edit')
  if (error) return error

  const body = await req.json().catch(() => ({}))
  const id = decodeURIComponent(params.id)
  const result = await updateCollection(id, body)
  if (!result.success) {
    return NextResponse.json({
      success: false, message: result.errors.map((e: any) => e.message).join('; ')
    }, { status: 400 })
  }
  await logAudit({
    userId: user.id, userEmail: user.email!,
    action: 'collections.update', resource: `collection:${id}`,
    detail: body, req,
  })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requirePermission('collections.edit')
  if (error) return error

  const id = decodeURIComponent(params.id)
  const result = await deleteCollection(id)
  if (!result.success) {
    return NextResponse.json({
      success: false, message: result.errors.map((e: any) => e.message).join('; ')
    }, { status: 400 })
  }
  await logAudit({
    userId: user.id, userEmail: user.email!,
    action: 'collections.delete', resource: `collection:${id}`, req,
  })
  return NextResponse.json({ success: true })
}
