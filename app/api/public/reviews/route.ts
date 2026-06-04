import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { corsJson, corsPreflight } from '@/lib/cors'

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req)
}

// images JSON string -> string[] (bozuk veride boş döner)
function parseImages(raw: string | null): string[] {
  if (!raw) return []
  try {
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.filter(x => typeof x === 'string') : []
  } catch {
    return []
  }
}

// Gelen images'i doğrula: en fazla 4 adet, sadece data:image/ veya http(s) URL, max ~2MB/parça
function sanitizeImages(input: unknown): string[] {
  if (!Array.isArray(input)) return []
  const out: string[] = []
  for (const item of input) {
    if (typeof item !== 'string') continue
    const ok = /^data:image\/(png|jpe?g|webp|gif);base64,/.test(item) || /^https?:\/\//.test(item)
    if (!ok) continue
    if (item.length > 2_800_000) continue // ~2MB base64 üst sınır
    out.push(item)
    if (out.length >= 4) break
  }
  return out
}

/**
 * GET /api/public/reviews?productId=12345&limit=20&offset=0&sort=newest
 *
 * Sadece APPROVED durumundaki yorumları döner.
 * Storefront widget bunu çağırır.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const productId = sp.get('productId')
  const limit = Math.min(parseInt(sp.get('limit') || '20', 10), 100)
  const offset = Math.max(parseInt(sp.get('offset') || '0', 10), 0)
  const sort = sp.get('sort') || 'newest'

  if (!productId) {
    return corsJson(req, { success: false, message: 'productId gerekli' }, { status: 400 })
  }

  // Shopify GID veya plain ID — her ikisini de destekle
  const productIdVariants = [
    productId,
    productId.includes('gid://') ? productId : `gid://shopify/Product/${productId}`,
    productId.includes('gid://') ? productId.split('/').pop()! : productId,
  ]

  try {
    const orderBy: any = sort === 'highest' ? { rating: 'desc' }
      : sort === 'lowest' ? { rating: 'asc' }
      : { createdAt: 'desc' }

    const [reviews, total, avgData] = await Promise.all([
      prisma.productReview.findMany({
        where: {
          shopifyProductId: { in: productIdVariants },
          status: 'APPROVED',
        },
        orderBy, take: limit, skip: offset,
        select: {
          id: true, customerName: true, rating: true, title: true,
          content: true, images: true, helpfulCount: true, createdAt: true,
        },
      }),
      prisma.productReview.count({
        where: { shopifyProductId: { in: productIdVariants }, status: 'APPROVED' },
      }),
      prisma.productReview.aggregate({
        where: { shopifyProductId: { in: productIdVariants }, status: 'APPROVED' },
        _avg: { rating: true },
      }),
    ])

    // Rating breakdown (1-5 yıldız dağılımı)
    const breakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    const allRatings = await prisma.productReview.findMany({
      where: { shopifyProductId: { in: productIdVariants }, status: 'APPROVED' },
      select: { rating: true },
    })
    for (const r of allRatings) breakdown[r.rating] = (breakdown[r.rating] ?? 0) + 1

    return corsJson(req, {
      success: true,
      productId,
      total,
      averageRating: avgData._avg.rating ?? 0,
      breakdown,
      reviews: reviews.map(r => ({
        ...r,
        images: parseImages(r.images),
        createdAt: r.createdAt.toISOString(),
      })),
    })
  } catch (e: any) {
    return corsJson(req, { success: false, message: e?.message }, { status: 500 })
  }
}

/**
 * POST /api/public/reviews
 * Body: { productId, productTitle?, customerName, customerEmail?, rating, title?, content }
 *
 * Yorum PENDING olarak kaydedilir — admin onayından sonra widget'ta görünür.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))

  if (!body.productId || !body.customerName || !body.content || !body.rating) {
    return corsJson(req, {
      success: false,
      message: 'productId, customerName, content, rating gerekli',
    }, { status: 400 })
  }

  // Basit spam heuristic (admin endpoint'iyle aynı mantık)
  const spamWords = ['viagra', 'casino', 'porn', 'http://', 'https://', 'free money', 'click here']
  const lowerContent = String(body.content).toLowerCase()
  const spamHits = spamWords.filter(w => lowerContent.includes(w)).length
  const aiSpamScore = Math.min(spamHits * 25, 100)

  // Karakter sınırı
  if (String(body.content).length > 2000) {
    return corsJson(req, { success: false, message: 'İçerik 2000 karakteri aşamaz' }, { status: 400 })
  }
  if (String(body.content).length < 5) {
    return corsJson(req, { success: false, message: 'Yorum en az 5 karakter olmalı' }, { status: 400 })
  }

  try {
    const productIdGid = String(body.productId).includes('gid://')
      ? body.productId
      : `gid://shopify/Product/${body.productId}`

    const images = sanitizeImages(body.images)

    const review = await prisma.productReview.create({
      data: {
        shopifyProductId: productIdGid,
        productTitle: body.productTitle || '—',
        customerName: String(body.customerName).slice(0, 80),
        customerEmail: body.customerEmail ? String(body.customerEmail).slice(0, 120) : null,
        rating: Math.max(1, Math.min(5, Number(body.rating))),
        title: body.title ? String(body.title).slice(0, 120) : null,
        content: String(body.content).slice(0, 2000),
        images: images.length ? JSON.stringify(images) : null,
        status: aiSpamScore >= 50 ? 'SPAM' : 'PENDING',
        aiSpamScore,
      },
    })

    return corsJson(req, {
      success: true,
      reviewId: review.id,
      message: aiSpamScore >= 50
        ? 'Yorumun alındı, ancak otomatik kontrolden geçemedi. İnceleme bekliyor.'
        : 'Teşekkürler! Yorumun onay sürecindedir, en kısa sürede yayınlanacaktır.',
    })
  } catch (e: any) {
    return corsJson(req, { success: false, message: e?.message }, { status: 500 })
  }
}
