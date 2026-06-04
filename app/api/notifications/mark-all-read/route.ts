import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/nextauth'
import { prisma } from '@/lib/prisma'

export async function POST() {
  const session: any = await getServerSession(authOptions)
  const userId = session?.user?.id ? Number(session.user.id) : null

  try {
    await prisma.notification.updateMany({
      where: {
        read: false,
        OR: [{ userId: null }, ...(userId ? [{ userId }] : [])],
      },
      data: { read: true },
    })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}
