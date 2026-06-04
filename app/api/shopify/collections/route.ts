import { NextRequest, NextResponse } from 'next/server'
import { getCollections, createCollection } from '@/lib/shopify-collections'
import { requirePermission } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

export async function GET(req: NextRequest) {
  const { error } = await requirePermission('collections.view')
  if (error) return error

  const sp = req.nextUrl.searchParams
  try {
    const result = await getCollections({
      first: parseInt(sp.get('first') || '25', 10),
      after: sp.get('after'),
      search: sp.get('search') || undefined,
    })
    return NextResponse.json({ success: true, ...result })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { user, error } = await requirePermission('collections.edit')
  if (error) return error

  const body = await req.json().catch(() => ({}))
  if (!body.title) {
    return NextResponse.json({ success: false, message: 'Başlık gerekli' }, { status: 400 })
  }
  const result = await createCollection({
    title: body.title,
    descriptionHtml: body.descriptionHtml,
  })
  if (!result.success) {
    return NextResponse.json({
      success: false, message: result.errors.map((e: any) => e.message).join('; ')
    }, { status: 400 })
  }
  await logAudit({
    userId: user.id, userEmail: user.email!,
    action: 'collections.create', resource: result.id ? `collection:${result.id}` : null,
    detail: { title: body.title }, req,
  })
  return NextResponse.json({ success: true, id: result.id })
}
