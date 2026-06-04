import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { corsJson, corsPreflight } from '@/lib/cors'

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req)
}

/**
 * GET /api/public/reviews/schema?productId=X&productName=Y&productUrl=Z
 *
 * Google Rich Snippets için JSON-LD üretir.
 * Theme app extension veya snippet bunu kullanır.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const productId = sp.get('productId')
  const productName = sp.get('productName') || 'Ürün'
  const productUrl = sp.get('productUrl') || ''

  if (!productId) {
    return corsJson(req, { success: false }, { status: 400 })
  }

  const productIdVariants = [
    productId,
    productId.includes('gid://') ? productId : `gid://shopify/Product/${productId}`,
  ]

  try {
    const [reviews, agg] = await Promise.all([
      prisma.productReview.findMany({
        where: { shopifyProductId: { in: productIdVariants }, status: 'APPROVED' },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { customerName: true, rating: true, title: true, content: true, createdAt: true },
      }),
      prisma.productReview.aggregate({
        where: { shopifyProductId: { in: productIdVariants }, status: 'APPROVED' },
        _count: { id: true },
        _avg: { rating: true },
      }),
    ])

    const count = agg._count.id
    const avg = agg._avg.rating ?? 0

    const schema: any = {
      '@context': 'https://schema.org/',
      '@type': 'Product',
      name: productName,
      ...(productUrl ? { url: productUrl } : {}),
    }

    if (count > 0) {
      schema.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: avg.toFixed(1),
        reviewCount: count,
        bestRating: 5,
        worstRating: 1,
      }
      schema.review = reviews.map(r => ({
        '@type': 'Review',
        reviewRating: {
          '@type': 'Rating',
          ratingValue: r.rating,
          bestRating: 5,
        },
        author: { '@type': 'Person', name: r.customerName },
        datePublished: r.createdAt.toISOString().slice(0, 10),
        ...(r.title ? { name: r.title } : {}),
        reviewBody: r.content,
      }))
    }

    return corsJson(req, { success: true, schema, count, average: avg })
  } catch (e: any) {
    return corsJson(req, { success: false, message: e?.message }, { status: 500 })
  }
}
