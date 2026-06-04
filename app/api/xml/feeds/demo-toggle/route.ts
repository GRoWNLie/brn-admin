import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { DEFAULT_SHOP } from '@/lib/xml-engine/shopify'

// POST /api/xml/feeds/demo-toggle?shop=...
export async function POST(req: NextRequest) {
  const shop = req.nextUrl.searchParams.get('shop') || DEFAULT_SHOP
  try {
    const existing = await prisma.feed.findMany({ where: { shop } })
    if (existing.length > 0) {
      await prisma.feed.deleteMany({ where: { shop } })
      return NextResponse.json({ success: true, mode: 'postgres', count: 0 })
    }
    const now = new Date()
    const lastSyncStr = now.toISOString().replace('T', ' ').substring(0, 16)
    const nextSyncStr = new Date(now.getTime() + 2 * 60 * 60 * 1000)
      .toISOString().replace('T', ' ').substring(0, 16)

    await prisma.feed.create({
      data: {
        shop,
        title: 'Toptancı Demo Entegrasyonu',
        url: 'https://xmlbankasi.com/feed.xml',
        productCount: 6203,
        status: 'Aktif',
        syncStatus: 'Güncel',
        lastSync: lastSyncStr,
        nextSync: nextSyncStr,
      },
    })
    return NextResponse.json({ success: true, mode: 'postgres', count: 1 })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e.message }, { status: 500 })
  }
}
