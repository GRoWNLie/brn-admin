import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'

/** GET /api/audit?action=&userId=&take=&skip= */
export async function GET(req: NextRequest) {
  const { user, error } = await requirePermission('audit.view')
  if (error) return error

  const sp = req.nextUrl.searchParams
  const action = sp.get('action') || undefined
  const userId = sp.get('userId') ? parseInt(sp.get('userId')!, 10) : undefined
  const take = Math.min(parseInt(sp.get('take') || '100', 10), 500)
  const skip = parseInt(sp.get('skip') || '0', 10)

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where: {
        ...(action ? { action: { contains: action, mode: 'insensitive' } } : {}),
        ...(userId ? { userId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take, skip,
    }),
    prisma.auditLog.count({
      where: {
        ...(action ? { action: { contains: action, mode: 'insensitive' } } : {}),
        ...(userId ? { userId } : {}),
      },
    }),
  ])

  return NextResponse.json({ success: true, logs, total })
}
