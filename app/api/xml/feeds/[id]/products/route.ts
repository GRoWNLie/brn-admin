import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/xml/feeds/:id/products
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const feedId = Number(params.id)
  try {
    const products = await prisma.product.findMany({
      where: { feedId },
      orderBy: { id: 'desc' },
    })
    return NextResponse.json({ success: true, mode: 'postgres', products })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e.message }, { status: 500 })
  }
}
