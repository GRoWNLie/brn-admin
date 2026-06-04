import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'
import { logAuditAuto } from '@/lib/audit'

const ALLOWED = ['logoUrl', 'primaryColor', 'secondaryColor', 'bgColor', 'textColor', 'fontFamily', 'borderRadius', 'customCss']

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission('settings.manage')
  if (error) return error
  const storeId = Number(params.id)
  const b = await req.json().catch(() => ({}))
  const data: any = {}
  for (const k of ALLOWED) if (b[k] !== undefined) data[k] = b[k]
  if (typeof data.borderRadius === 'string') data.borderRadius = parseInt(data.borderRadius, 10) || 0

  const theme = await prisma.storeTheme.upsert({
    where: { storeId },
    create: { storeId, ...data },
    update: data,
  })
  await logAuditAuto('store.theme', { req, resource: `store:${storeId}`, detail: { keys: Object.keys(data) } })
  return NextResponse.json({ success: true, theme })
}
