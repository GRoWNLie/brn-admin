import { NextRequest, NextResponse } from 'next/server'
import { addRecentlyViewed, getSession } from '@/lib/storefront-session'
import { prisma } from '@/lib/prisma'

// POST /api/storefront/[storeId]/recent — { productId } : recently viewed listesine ekle
export async function POST(req: NextRequest, { params }: { params: { storeId: string } }) {
  const storeId = Number(params.storeId)
  const b = await req.json().catch(() => ({}))
  const pid = typeof b.productId === 'string' ? b.productId.slice(0, 120) : ''
  if (!pid) return NextResponse.json({ success: false, message: 'productId gerekli' }, { status: 400 })
  await addRecentlyViewed(storeId, pid)
  // Genel aktivite kaydı (KVKK uyumu için müşteri varsa müşteri kimliğiyle)
  const s = await getSession(storeId)
  if (s) {
    await prisma.customerActivity.create({
      data: { storeId, customerId: s.customerId, sessionToken: s.id, type: 'view', ref: pid },
    }).catch(() => {})
  }
  return NextResponse.json({ success: true })
}
