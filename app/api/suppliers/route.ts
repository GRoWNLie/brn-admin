import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAuditAuto } from '@/lib/audit'

export async function GET() {
  try {
    const suppliers = await prisma.supplier.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json({ success: true, suppliers })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  if (!body.name) return NextResponse.json({ success: false, message: 'name gerekli' }, { status: 400 })
  try {
    const s = await prisma.supplier.create({
      data: {
        name: body.name,
        contact: body.contact, email: body.email, phone: body.phone,
        address: body.address, taxId: body.taxId, notes: body.notes,
      },
    })
    await logAuditAuto("supplier.create", { req, resource: `supplier:${s.id}`, detail: { name: s.name } })
    return NextResponse.json({ success: true, supplier: s })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}
