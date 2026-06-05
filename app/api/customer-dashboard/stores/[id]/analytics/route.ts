import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'

// GET /api/customer-dashboard/stores/[id]/analytics?range=30
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission('settings.manage')
  if (error) return error
  const storeId = Number(params.id)
  const range = Math.min(Math.max(parseInt(req.nextUrl.searchParams.get('range') || '30', 10) || 30, 1), 365)
  const since = new Date(Date.now() - range * 24 * 60 * 60 * 1000)
  const activeSince = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const [totalCustomers, activeSessions, totalSessions, signupsInRange, pageViews, topProductsRaw] = await Promise.all([
    // Bu mağazaya ait benzersiz customer sayısı (session bazlı)
    prisma.storefrontSession.findMany({ where: { storeId, customerId: { not: null } }, select: { customerId: true }, distinct: ['customerId'] }),
    // Son 24 saat içinde aktif session
    prisma.storefrontSession.count({ where: { storeId, updatedAt: { gte: activeSince } } }),
    // Aralıkta açılan toplam session
    prisma.storefrontSession.count({ where: { storeId, createdAt: { gte: since } } }),
    // Aralıkta açılan toplam customer'lı session (kayıt yaklaşığı)
    prisma.storefrontSession.count({ where: { storeId, createdAt: { gte: since }, customerId: { not: null } } }),
    // Aralıkta toplam aktivite (sayfa görüntüleme)
    prisma.customerActivity.count({ where: { storeId, createdAt: { gte: since } } }),
    // En çok görüntülenen ürünler (recent type)
    prisma.customerActivity.groupBy({
      by: ['ref'], where: { storeId, type: 'view', createdAt: { gte: since } },
      _count: { ref: true }, orderBy: { _count: { ref: 'desc' } }, take: 10,
    }).catch(() => [] as any[]),
  ])

  // Günlük session trendi
  const daily = await prisma.storefrontSession.findMany({
    where: { storeId, createdAt: { gte: since } },
    select: { createdAt: true, customerId: true },
  })
  const dailyMap = new Map<string, { sessions: number; signups: number }>()
  for (let i = range - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000)
    dailyMap.set(d.toISOString().slice(0, 10), { sessions: 0, signups: 0 })
  }
  for (const s of daily) {
    const k = s.createdAt.toISOString().slice(0, 10)
    const cur = dailyMap.get(k); if (!cur) continue
    cur.sessions += 1
    if (s.customerId) cur.signups += 1
  }

  return NextResponse.json({
    success: true,
    range,
    stats: {
      totalCustomers: totalCustomers.length,
      activeSessions,
      totalSessions,
      signupsInRange,
      pageViews,
      conversionRate: totalSessions > 0 ? Math.round((signupsInRange / totalSessions) * 10000) / 100 : 0,
    },
    daily: Array.from(dailyMap.entries()).map(([date, v]) => ({ date, ...v })),
    topProducts: (topProductsRaw as any[]).map(r => ({ ref: r.ref, count: r._count.ref })),
  })
}
