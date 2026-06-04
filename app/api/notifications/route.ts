import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/nextauth'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notifications'

// GET /api/notifications?unreadOnly=1&limit=20
export async function GET(req: NextRequest) {
  const session: any = await getServerSession(authOptions)
  const userId = session?.user?.id ? Number(session.user.id) : null

  const sp = req.nextUrl.searchParams
  const unreadOnly = sp.get('unreadOnly') === '1'
  const limit = Math.min(parseInt(sp.get('limit') || '20', 10), 100)

  try {
    const where: any = {
      OR: [
        { userId: null },           // broadcast
        ...(userId ? [{ userId }] : []),
      ],
    }
    if (unreadOnly) where.read = false

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where, orderBy: { createdAt: 'desc' }, take: limit,
      }),
      prisma.notification.count({
        where: {
          read: false,
          OR: [{ userId: null }, ...(userId ? [{ userId }] : [])],
        },
      }),
    ])

    return NextResponse.json({ success: true, notifications, unreadCount })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}

// POST /api/notifications — yeni bildirim oluştur (admin)
// Body: { title, body, link?, category?, userId? }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  if (!body.title || !body.body) {
    return NextResponse.json({ success: false, message: 'title ve body gerekli' }, { status: 400 })
  }

  try {
    const n = await createNotification({
      title: body.title,
      body: body.body,
      link: body.link,
      category: body.category,
      userId: body.userId ?? null,
    })
    return NextResponse.json({ success: true, notification: n })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}
