import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'
import { logAuditAuto } from '@/lib/audit'
import { invalidateStoreCache } from '@/lib/store-cache'
import { maskStore, updateStoreConfig } from '@/lib/customer-dashboard'

// GET /api/customer-dashboard/stores/[id] — tek mağaza (tema + içerik + sayfalar dahil)
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission('settings.manage')
  if (error) return error
  const id = Number(params.id)
  const store = await prisma.store.findUnique({
    where: { id }, include: { theme: true, content: true, pages: { orderBy: { pageKey: 'asc' } } },
  })
  if (!store) return NextResponse.json({ success: false, message: 'Mağaza bulunamadı' }, { status: 404 })
  return NextResponse.json({
    success: true,
    store: maskStore(store),
    theme: store.theme,
    content: store.content,
    pages: store.pages,
  })
}

// PATCH /api/customer-dashboard/stores/[id] — temel alanlar + config (merge)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission('settings.manage')
  if (error) return error
  const id = Number(params.id)
  const b = await req.json().catch(() => ({}))
  const data: any = {}
  if (typeof b.name === 'string') data.name = b.name.slice(0, 120)
  if (typeof b.shopifyDomain === 'string') data.shopifyDomain = b.shopifyDomain
  if (b.customDomain !== undefined) data.customDomain = b.customDomain || null
  if (typeof b.status === 'string' && ['active', 'paused', 'setup'].includes(b.status)) data.status = b.status

  if (Object.keys(data).length) await prisma.store.update({ where: { id }, data })
  if (b.config && typeof b.config === 'object') {
    await updateStoreConfig(id, b.config)
  }
  await logAuditAuto('store.update', { req, resource: `store:${id}`, detail: { keys: Object.keys(data) } })
  const store = await prisma.store.findUnique({ where: { id } })
  return NextResponse.json({ success: true, store: store ? maskStore(store) : null })
}

// DELETE /api/customer-dashboard/stores/[id]
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission('settings.manage')
  if (error) return error
  const id = Number(params.id)
  await prisma.store.delete({ where: { id } })
  invalidateStoreCache(id)
  await logAuditAuto('store.delete', { resource: `store:${id}` })
  return NextResponse.json({ success: true })
}
