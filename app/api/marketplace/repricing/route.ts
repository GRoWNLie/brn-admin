import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { logAuditAuto } from '@/lib/audit'
import { runRepricing } from '@/lib/repricing'

// GET — tüm repricing kuralları
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, message: 'Oturum yok' }, { status: 401 })
  const rules = await prisma.repricingRule.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json({ success: true, rules })
}

// POST — kural ekle/güncelle veya { action: 'run' } ile çalıştır
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, message: 'Oturum yok' }, { status: 401 })
  const b = await req.json().catch(() => ({}))

  if (b.action === 'run') {
    const results = await runRepricing()
    await logAuditAuto('repricing.run', { req, detail: { marketplaces: results.length } })
    return NextResponse.json({ success: true, results })
  }

  if (!b.marketplace) return NextResponse.json({ success: false, message: 'marketplace gerekli' }, { status: 400 })
  const data = {
    marketplace: String(b.marketplace),
    sku: b.sku ? String(b.sku) : null,
    enabled: b.enabled !== false,
    strategy: ['match_buybox', 'beat_by', 'fixed'].includes(b.strategy) ? b.strategy : 'match_buybox',
    beatAmount: b.beatAmount != null && b.beatAmount !== '' ? Number(b.beatAmount) : null,
    fixedPrice: b.fixedPrice != null && b.fixedPrice !== '' ? Number(b.fixedPrice) : null,
    minPrice: b.minPrice != null && b.minPrice !== '' ? Number(b.minPrice) : null,
    maxPrice: b.maxPrice != null && b.maxPrice !== '' ? Number(b.maxPrice) : null,
  }
  const rule = b.id
    ? await prisma.repricingRule.update({ where: { id: Number(b.id) }, data })
    : await prisma.repricingRule.create({ data })
  await logAuditAuto('repricing.rule_save', { req, resource: `repricing:${rule.id}`, detail: { marketplace: rule.marketplace, sku: rule.sku, strategy: rule.strategy } })
  return NextResponse.json({ success: true, rule })
}

// DELETE ?id=
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, message: 'Oturum yok' }, { status: 401 })
  const id = Number(req.nextUrl.searchParams.get('id'))
  if (!id) return NextResponse.json({ success: false, message: 'id gerekli' }, { status: 400 })
  await prisma.repricingRule.delete({ where: { id } })
  await logAuditAuto('repricing.rule_delete', { req, resource: `repricing:${id}` })
  return NextResponse.json({ success: true })
}
