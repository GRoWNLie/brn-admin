import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/xml/feeds/save-mapping
// Body: { feedId?, mappingData }
export async function POST(req: NextRequest) {
  const { feedId, mappingData } = await req.json().catch(() => ({}))
  try {
    let targetFeedId = feedId
    if (!targetFeedId) {
      const last = await prisma.feed.findFirst({ orderBy: { id: 'desc' } })
      targetFeedId = last?.id
    }
    if (!targetFeedId) {
      return NextResponse.json({ success: false, message: 'Hedef feed yok' }, { status: 400 })
    }

    const existing = await prisma.mapping.findFirst({ where: { feedId: targetFeedId } })
    if (existing) {
      await prisma.mapping.update({
        where: { id: existing.id },
        data: { mappingData },
      })
    } else {
      await prisma.mapping.create({
        data: { feedId: targetFeedId, mappingData },
      })
    }
    return NextResponse.json({ success: true, mode: 'postgres' })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e.message }, { status: 500 })
  }
}
