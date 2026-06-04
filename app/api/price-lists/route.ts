import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAuditAuto } from '@/lib/audit'

export async function GET() {
  try {
    const lists = await prisma.priceList.findMany({
      include: { items: { take: 5 } },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ success: true, lists })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  if (!body.name || !body.adjustmentValue) {
    return NextResponse.json({ success: false, message: 'name + adjustmentValue gerekli' }, { status: 400 })
  }
  try {
    const list = await prisma.priceList.create({
      data: {
        name: body.name,
        segmentType: body.segmentType || 'all',
        segmentValue: body.segmentValue,
        adjustmentType: body.adjustmentType || 'percent_off',
        adjustmentValue: Number(body.adjustmentValue),
        startsAt: body.startsAt ? new Date(body.startsAt) : null,
        endsAt: body.endsAt ? new Date(body.endsAt) : null,
        notes: body.notes,
      },
    })
    await logAuditAuto("price_list.create", { req, resource: `price_list:${list.id}` })
    return NextResponse.json({ success: true, list })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}
