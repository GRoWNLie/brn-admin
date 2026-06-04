import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const ex = await prisma.export.findUnique({ where: { id: Number(params.id) } })
  if (!ex) return NextResponse.json({ success: false, message: 'Bulunamadı' }, { status: 404 })
  return NextResponse.json({ success: true, export: ex })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}))
  const allowedKeys = ['title', 'rootTag', 'itemTag', 'encoding', 'mappingData', 'filtersData',
    'includeImages', 'includeVariants', 'autoRefreshMin', 'status']
  const data: any = {}
  for (const k of allowedKeys) if (k in body) data[k] = body[k]

  try {
    const ex = await prisma.export.update({ where: { id: Number(params.id) }, data })
    return NextResponse.json({ success: true, export: ex })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e.message }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.export.delete({ where: { id: Number(params.id) } })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e.message }, { status: 500 })
  }
}
