import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PATCH /api/notifications/[id] — okundu/okunmadı toggle
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}))
  try {
    const n = await prisma.notification.update({
      where: { id: Number(params.id) },
      data: { read: body.read !== undefined ? !!body.read : true },
    })
    return NextResponse.json({ success: true, notification: n })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.notification.delete({ where: { id: Number(params.id) } })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}
