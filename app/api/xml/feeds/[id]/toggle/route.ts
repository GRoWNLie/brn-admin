import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/xml/feeds/:id/toggle
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const feedId = Number(params.id)
  try {
    const feed = await prisma.feed.findUnique({ where: { id: feedId } })
    if (!feed) {
      return NextResponse.json({ success: false, message: 'Feed bulunamadı' }, { status: 404 })
    }
    const newStatus = feed.status === 'Aktif' ? 'Duraklatıldı' : 'Aktif'
    await prisma.feed.update({ where: { id: feedId }, data: { status: newStatus } })
    return NextResponse.json({ success: true, mode: 'postgres', status: newStatus })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e.message }, { status: 500 })
  }
}
