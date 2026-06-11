import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAuditAuto } from '@/lib/audit'

// PATCH /api/reviews/[id] — onay/red
// Body: { status: "APPROVED" | "REJECTED" | "SPAM", rejectionReason?: string }
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}))

  // Featured toggle
  if (typeof body.featured === 'boolean') {
    try {
      const review = await prisma.productReview.update({
        where: { id: Number(params.id) },
        data: { featured: body.featured },
      })
      await logAuditAuto("review.feature", { req, resource: `review:${params.id}`, detail: { featured: body.featured } })
      return NextResponse.json({ success: true, review })
    } catch (e: any) {
      return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
    }
  }

  if (!['APPROVED', 'REJECTED', 'SPAM', 'PENDING'].includes(body.status)) {
    return NextResponse.json({ success: false, message: 'Geçersiz status' }, { status: 400 })
  }

  try {
    const review = await prisma.productReview.update({
      where: { id: Number(params.id) },
      data: {
        status: body.status,
        rejectionReason: body.rejectionReason ?? null,
        reviewedAt: new Date(),
      },
    })
    await logAuditAuto("review.moderate", { req, resource: `review:${params.id}`, detail: { status: body.status } })
    return NextResponse.json({ success: true, review })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.productReview.delete({ where: { id: Number(params.id) } })
    await logAuditAuto("review.delete", { req: _req, resource: `review:${params.id}` })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}
