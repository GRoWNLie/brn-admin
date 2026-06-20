import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/nextauth'
import { prisma } from '@/lib/prisma'

const ACTIVE_MIN = 5 // aktif sayılma süresi (dakika)

function parsePageType(path: string | null): string {
  if (!path) return 'Geziyor'
  const p = path.split('?')[0].toLowerCase()
  if (p === '/' || p === '') return 'Geziyor'
  if (p.includes('/search') || p.includes('?q=')) return 'Arıyor'
  if (p.includes('/products/') || p.includes('/urunler/')) return 'Ürün Bakıyor'
  if (p.includes('/collections/') || p.includes('/kategoriler/') || p.includes('/category')) return 'Kategori'
  if (p.includes('/cart') || p.includes('/sepet')) return 'Sepette'
  if (p.includes('/checkout') || p.includes('/odeme')) return 'Ödeme'
  if (p.includes('/thank') || p.includes('/order-confirmed') || p.includes('/siparis-tamamlandi')) return 'Sipariş Verdi'
  return 'Geziyor'
}

function parseDevice(ua: string | null): string {
  if (!ua) return 'desktop'
  const u = ua.toLowerCase()
  if (u.includes('mobile') || u.includes('android') || u.includes('iphone')) return 'mobile'
  if (u.includes('tablet') || u.includes('ipad')) return 'tablet'
  return 'desktop'
}

function parseBrowser(ua: string | null): string {
  if (!ua) return 'other'
  const u = ua.toLowerCase()
  if (u.includes('edg/')) return 'edge'
  if (u.includes('chrome/') && !u.includes('chromium')) return 'chrome'
  if (u.includes('firefox/')) return 'firefox'
  if (u.includes('safari/') && !u.includes('chrome')) return 'safari'
  if (u.includes('opr/') || u.includes('opera')) return 'opera'
  return 'other'
}

function parseTrafficSource(referrer: string | null): string {
  if (!referrer) return 'Direkt'
  try {
    const host = new URL(referrer).hostname.toLowerCase()
    if (host.includes('google')) return 'Google'
    if (host.includes('facebook') || host.includes('fb.com')) return 'Facebook'
    if (host.includes('instagram')) return 'Instagram'
    if (host.includes('tiktok')) return 'TikTok'
    if (host.includes('twitter') || host.includes('t.co')) return 'Twitter/X'
    if (host.includes('youtube')) return 'YouTube'
    if (host.includes('bing')) return 'Bing'
    return host
  } catch {
    return 'Direkt'
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false }, { status: 401 })

  const since = new Date(Date.now() - ACTIVE_MIN * 60 * 1000)
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)

  const [activeVisitors, todayCount, cartSessions] = await Promise.all([
    prisma.visitorSession.findMany({
      where: { lastSeen: { gte: since } },
      orderBy: { lastSeen: 'desc' },
      take: 100,
    }),
    prisma.visitorSession.count({ where: { firstSeen: { gte: todayStart } } }),
    prisma.cartSession.findMany({
      where: { updatedAt: { gte: since } },
      select: { id: true, itemCount: true, customerEmail: true },
    }),
  ])

  const visitors = activeVisitors.map(v => {
    const pageType = parsePageType(v.path)
    const trafficSource = parseTrafficSource(v.referrer)
    return {
      id: v.id,
      ip: v.ip ?? '—',
      city: v.city ?? null,
      country: v.country ?? null,
      path: v.path ?? '/',
      pageType,
      referrer: v.referrer ?? '',
      trafficSource,
      device: parseDevice(v.userAgent),
      browser: parseBrowser(v.userAgent),
      firstSeen: v.firstSeen.toISOString(),
      lastSeen: v.lastSeen.toISOString(),
    }
  })

  // Funnel sayıları
  const funnel: Record<string, number> = {
    'Geziyor': 0, 'Arıyor': 0, 'Ürün Bakıyor': 0, 'Kategori': 0,
    'Sepette': 0, 'Ödeme': 0, 'Sipariş Verdi': 0,
  }
  visitors.forEach(v => { if (funnel[v.pageType] !== undefined) funnel[v.pageType]++ })

  // Traffic sources
  const trafficSources: Record<string, number> = {}
  visitors.forEach(v => {
    trafficSources[v.trafficSource] = (trafficSources[v.trafficSource] || 0) + 1
  })

  const inCart = visitors.filter(v => v.pageType === 'Sepette').length
  const inCheckout = visitors.filter(v => v.pageType === 'Ödeme').length

  return NextResponse.json({
    success: true,
    stats: {
      online: activeVisitors.length,
      todayTotal: todayCount,
      inCart,
      inCheckout,
    },
    funnel,
    trafficSources,
    visitors,
    updatedAt: new Date().toISOString(),
  })
}
