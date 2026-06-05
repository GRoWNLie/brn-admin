import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'
import { logAuditAuto } from '@/lib/audit'
import { invalidateStoreCache } from '@/lib/store-cache'

const ALLOWED = ['topBannerText', 'welcomeTemplate', 'kvkkText', 'termsText']

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission('settings.manage')
  if (error) return error
  const storeId = Number(params.id)
  const b = await req.json().catch(() => ({}))
  const data: any = {}
  for (const k of ALLOWED) if (b[k] !== undefined) data[k] = b[k] === '' ? null : String(b[k])
  if (b.visibleTabs && typeof b.visibleTabs === 'object') data.visibleTabs = JSON.stringify(b.visibleTabs)

  const content = await prisma.storeContent.upsert({
    where: { storeId },
    create: { storeId, ...data },
    update: data,
  })
  await logAuditAuto('store.content', { req, resource: `store:${storeId}`, detail: { keys: Object.keys(data) } })
  return NextResponse.json({ success: true, content })
}
