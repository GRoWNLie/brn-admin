import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { logAuditAuto } from '@/lib/audit'
import { getLoyaltySettings } from '@/lib/loyalty'

// GET /api/loyalty — ayarlar + özet + en çok puanlı hesaplar
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, message: 'Oturum yok' }, { status: 401 })

  const settings = await getLoyaltySettings()
  const [memberCount, outstanding, redeemedAgg, accounts, tiers] = await Promise.all([
    prisma.loyaltyAccount.count(),
    prisma.loyaltyAccount.aggregate({ _sum: { balance: true } }),
    prisma.loyaltyAccount.aggregate({ _sum: { totalRedeemed: true } }),
    prisma.loyaltyAccount.findMany({ orderBy: { balance: 'desc' }, take: 50 }),
    prisma.loyaltyAccount.groupBy({ by: ['tier'], _count: { id: true } }),
  ])

  return NextResponse.json({
    success: true,
    settings,
    stats: {
      members: memberCount,
      outstanding: outstanding._sum.balance ?? 0,
      redeemed: redeemedAgg._sum.totalRedeemed ?? 0,
      tiers: Object.fromEntries(tiers.map(t => [t.tier, t._count.id])),
    },
    accounts,
  })
}

// POST /api/loyalty — ayarları kaydet (ADMIN)
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, message: 'Oturum yok' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ success: false, message: 'Sadece ADMIN' }, { status: 403 })

  const b = await req.json().catch(() => ({}))
  const cur = await getLoyaltySettings()
  const num = (v: any, d: number) => (v !== undefined && v !== '' && !isNaN(Number(v)) ? Number(v) : d)
  const updated = await prisma.loyaltySetting.update({
    where: { id: cur.id },
    data: {
      enabled: typeof b.enabled === 'boolean' ? b.enabled : cur.enabled,
      pointsPerCurrency: Math.max(0, num(b.pointsPerCurrency, cur.pointsPerCurrency)),
      redeemValue: Math.max(0, num(b.redeemValue, cur.redeemValue)),
      minRedeem: Math.max(1, Math.floor(num(b.minRedeem, cur.minRedeem))),
      signupBonus: Math.max(0, Math.floor(num(b.signupBonus, cur.signupBonus))),
      silverThreshold: Math.max(0, Math.floor(num(b.silverThreshold, cur.silverThreshold))),
      goldThreshold: Math.max(0, Math.floor(num(b.goldThreshold, cur.goldThreshold))),
    },
  })
  await logAuditAuto('loyalty.settings', { req, detail: { enabled: updated.enabled, pointsPerCurrency: updated.pointsPerCurrency } })
  return NextResponse.json({ success: true, settings: updated })
}
