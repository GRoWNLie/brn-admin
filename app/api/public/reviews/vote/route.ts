import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { corsJson, corsPreflight } from '@/lib/cors'

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req)
}

/**
 * POST /api/public/reviews/vote
 * Body: { reviewId: number, type: "like" | "dislike" }
 * Duplicate kontrolü widget tarafında localStorage ile yapılır.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const reviewId = Number(body.reviewId)
  const type = body.type

  if (!reviewId || !['like', 'dislike'].includes(type)) {
    return corsJson(req, { success: false, message: 'reviewId ve type (like|dislike) gerekli' }, { status: 400 })
  }

  try {
    const review = await prisma.productReview.findUnique({
      where: { id: reviewId },
      select: { id: true, status: true },
    })

    if (!review || review.status !== 'APPROVED') {
      return corsJson(req, { success: false, message: 'Yorum bulunamadı' }, { status: 404 })
    }

    const updated = await prisma.productReview.update({
      where: { id: reviewId },
      data: type === 'like'
        ? { helpfulCount: { increment: 1 } }
        : { dislikeCount: { increment: 1 } },
      select: { id: true, helpfulCount: true, dislikeCount: true },
    })

    return corsJson(req, {
      success: true,
      reviewId,
      likeCount: updated.helpfulCount,
      dislikeCount: updated.dislikeCount,
    })
  } catch (e: any) {
    return corsJson(req, { success: false, message: e?.message }, { status: 500 })
  }
}
