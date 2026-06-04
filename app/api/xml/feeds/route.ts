import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { DEFAULT_SHOP } from '@/lib/xml-engine/shopify'

// GET /api/xml/feeds?shop=...
export async function GET(req: NextRequest) {
  const shop = req.nextUrl.searchParams.get('shop') || DEFAULT_SHOP
  try {
    const feeds = await prisma.feed.findMany({
      where: { shop },
      orderBy: { id: 'desc' },
    })
    return NextResponse.json({ success: true, mode: 'postgres', feeds })
  } catch (e: any) {
    return NextResponse.json({ success: false, mode: 'error', message: e.message })
  }
}
