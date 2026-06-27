import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { corsJson, corsPreflight } from '@/lib/cors'

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req)
}

/**
 * GET /api/public/reviews/stats
 * Tüm onaylı yorumların özeti: toplam, ortalama puan, yıldız dağılımı.
 */
export async function GET(req: NextRequest) {
  try {
    const grouped = await prisma.productReview.groupBy({
      by: ['rating'],
      where: { status: 'APPROVED' },
      _count: { rating: true },
    })

    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<number, number>
    let total = 0
    let sum = 0
    grouped.forEach(g => {
      const r = Number(g.rating) || 0
      const c = g._count.rating
      if (r >= 1 && r <= 5) {
        counts[r] = c
        total += c
        sum += r * c
      }
    })

    const average = total > 0 ? sum / total : 0
    const distribution = [5, 4, 3, 2, 1].map(star =>
      total > 0 ? Math.round((counts[star] / total) * 100) : 0
    )

    return corsJson(req, {
      success: true,
      total,
      average: Number(average.toFixed(1)),
      counts,
      distribution, // [5★%, 4★%, 3★%, 2★%, 1★%]
    })
  } catch (e: any) {
    return corsJson(req, { success: false, message: e?.message }, { status: 500 })
  }
}
