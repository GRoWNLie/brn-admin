import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/einvoice/by-order?orderId=gid://...
export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get('orderId')
  if (!orderId) {
    return NextResponse.json({ success: false, message: 'orderId gerekli' }, { status: 400 })
  }
  try {
    const invoice = await prisma.eInvoice.findFirst({ where: { orderId } })
    return NextResponse.json({ success: true, invoice })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}
