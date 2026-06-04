import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const feed = await prisma.feed.findUnique({ where: { id: Number(params.id) } })
  if (!feed) {
    return NextResponse.json({ success: false, message: 'Feed bulunamadı' }, { status: 404 })
  }
  return NextResponse.json({ success: true, feed })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.feed.delete({ where: { id: Number(params.id) } })
    return NextResponse.json({ success: true, mode: 'postgres' })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e.message }, { status: 500 })
  }
}
