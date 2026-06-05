import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'
import { logAuditAuto } from '@/lib/audit'
import { invalidateStoreCache } from '@/lib/store-cache'
import { PAGE_KEYS } from '@/lib/customer-dashboard'

// PATCH /api/customer-dashboard/stores/[id]/pages
// Body: { updates: [{ pageKey, enabled?, title?, description? }, ...] }
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission('settings.manage')
  if (error) return error
  const storeId = Number(params.id)
  const b = await req.json().catch(() => ({}))
  const updates: any[] = Array.isArray(b.updates) ? b.updates : []
  for (const u of updates) {
    if (!PAGE_KEYS.includes(u.pageKey)) continue
    const data: any = {}
    if (typeof u.enabled === 'boolean') data.enabled = u.enabled
    if (u.title !== undefined) data.title = u.title || null
    if (u.description !== undefined) data.description = u.description || null
    await prisma.storePage.upsert({
      where: { storeId_pageKey: { storeId, pageKey: u.pageKey } },
      create: { storeId, pageKey: u.pageKey, ...data },
      update: data,
    })
  }
  invalidateStoreCache(storeId)
  await logAuditAuto('store.pages', { req, resource: `store:${storeId}`, detail: { count: updates.length } })
  const pages = await prisma.storePage.findMany({ where: { storeId }, orderBy: { pageKey: 'asc' } })
  return NextResponse.json({ success: true, pages })
}
