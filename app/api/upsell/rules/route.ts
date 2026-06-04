import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAuditAuto } from '@/lib/audit'

export async function GET() {
  try {
    const rules = await prisma.upsellRule.findMany({
      orderBy: [{ active: 'desc' }, { priority: 'desc' }, { createdAt: 'desc' }],
    })
    return NextResponse.json({ success: true, rules })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  if (!body.name || !body.sourceType || !Array.isArray(body.targetProductIds)) {
    return NextResponse.json({ success: false, message: 'name, sourceType, targetProductIds gerekli' }, { status: 400 })
  }

  try {
    const rule = await prisma.upsellRule.create({
      data: {
        name: body.name,
        sourceType: body.sourceType,
        sourceValue: body.sourceValue,
        targetProductIds: body.targetProductIds,
        placement: body.placement || 'cart',
        ruleType: body.ruleType || 'cross_sell',
        discountPercent: body.discountPercent,
        priority: body.priority || 0,
        active: body.active !== false,
      },
    })
    await logAuditAuto("upsell.create", { req, resource: `upsell:${rule.id}` })
    return NextResponse.json({ success: true, rule })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}
