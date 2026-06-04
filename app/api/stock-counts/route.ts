import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAuditAuto } from '@/lib/audit'

function generateCountNumber() {
  return `SC-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`
}

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get('status')
  try {
    const counts = await prisma.stockCount.findMany({
      where: status ? { status } : {},
      include: { items: true },
      orderBy: { startedAt: 'desc' },
      take: 50,
    })
    return NextResponse.json({ success: true, counts })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  if (!body.locationId) {
    return NextResponse.json({ success: false, message: 'locationId gerekli' }, { status: 400 })
  }
  try {
    const c = await prisma.stockCount.create({
      data: {
        countNumber: generateCountNumber(),
        locationId: body.locationId,
        locationName: body.locationName || body.locationId,
        notes: body.notes,
      },
    })
    await logAuditAuto('stock_count.create', {
      req, resource: `stock_count:${c.id}`,
      detail: { countNumber: c.countNumber, location: c.locationName },
    })
    return NextResponse.json({ success: true, count: c })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}
