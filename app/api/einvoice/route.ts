import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const where: any = {}
  if (sp.get('status')) where.status = sp.get('status')
  if (sp.get('type')) where.invoiceType = sp.get('type')

  try {
    const invoices = await prisma.eInvoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return NextResponse.json({ success: true, invoices })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}
