import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAuditAuto } from '@/lib/audit'

// GET /api/reviews?status=PENDING&productId=...
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const where: any = {}
  if (sp.get('status')) where.status = sp.get('status')
  if (sp.get('productId')) where.shopifyProductId = sp.get('productId')

  try {
    const reviews = await prisma.productReview.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(sp.get('limit') || '50', 10), 200),
    })
    const counts = await prisma.productReview.groupBy({
      by: ['status'],
      _count: { id: true },
    })
    const summary: Record<string, number> = {}
    counts.forEach(c => { summary[c.status] = c._count.id })
    return NextResponse.json({ success: true, reviews, summary })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}

// POST /api/reviews — yeni yorum (storefront / form submit)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  if (!body.shopifyProductId || !body.customerName || !body.content || !body.rating) {
    return NextResponse.json({
      success: false, message: 'shopifyProductId, customerName, content, rating gerekli'
    }, { status: 400 })
  }

  // Basit spam heuristic
  const spamWords = ['viagra', 'casino', 'porn', 'http://', 'https://']
  const lowerContent = body.content.toLowerCase()
  const spamHits = spamWords.filter(w => lowerContent.includes(w)).length
  const aiSpamScore = Math.min(spamHits * 25, 100)

  try {
    const review = await prisma.productReview.create({
      data: {
        shopifyProductId: body.shopifyProductId,
        productTitle: body.productTitle || '—',
        customerName: body.customerName,
        customerEmail: body.customerEmail,
        rating: Math.max(1, Math.min(5, Number(body.rating))),
        title: body.title,
        content: body.content,
        status: aiSpamScore >= 50 ? 'SPAM' : 'PENDING',
        aiSpamScore,
      },
    })
    await logAuditAuto("review.create", { req, resource: `review:${review.id}` })
    return NextResponse.json({ success: true, review })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}
