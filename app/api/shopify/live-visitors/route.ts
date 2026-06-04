import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Son bu kadar dakika içinde ping atan oturumlar "aktif/canlı" sayılır.
const ACTIVE_WINDOW_MIN = 5

/**
 * GET /api/shopify/live-visitors
 * Storefront beacon'ımızın (tracker.js) kaydettiği oturumlardan
 * şu an aktif olan ziyaretçi sayısını döner. Dashboard 30 sn'de bir poll eder.
 */
export async function GET() {
  try {
    const since = new Date(Date.now() - ACTIVE_WINDOW_MIN * 60 * 1000)
    const count = await prisma.visitorSession.count({
      where: { lastSeen: { gte: since } },
    })
    return NextResponse.json({ success: true, count })
  } catch (e) {
    return NextResponse.json({
      success: false,
      count: 0,
      error: e instanceof Error ? e.message : 'unknown',
    })
  }
}
