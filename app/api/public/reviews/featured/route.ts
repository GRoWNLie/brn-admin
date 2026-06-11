import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { corsJson, corsPreflight } from '@/lib/cors'

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req)
}

/**
 * GET /api/public/reviews/featured?limit=6
 * Anasayfada gösterilmek üzere admin'in "Öne Çıkar" işaretlediği yorumlar.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const limit = Math.min(parseInt(sp.get('limit') || '6', 10), 20)

  try {
    const reviews = await prisma.productReview.findMany({
      where: { status: 'APPROVED', featured: true },
      orderBy: { helpfulCount: 'desc' },
      take: limit,
      select: {
        id: true, customerName: true, rating: true, title: true,
        content: true, images: true, helpfulCount: true, dislikeCount: true,
        productTitle: true, createdAt: true,
      },
    })

    return corsJson(req, {
      success: true,
      reviews: reviews.map(r => {
        let imgs: string[] = []
        try { imgs = JSON.parse(r.images || '[]') } catch {}
        return { ...r, images: Array.isArray(imgs) ? imgs : [], createdAt: r.createdAt.toISOString() }
      }),
    })
  } catch (e: any) {
    return corsJson(req, { success: false, message: e?.message }, { status: 500 })
  }
}
