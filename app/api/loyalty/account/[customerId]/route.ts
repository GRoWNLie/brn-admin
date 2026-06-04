import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission, getCurrentUser } from '@/lib/auth'
import { logAuditAuto } from '@/lib/audit'
import { getOrCreateAccount, adjustPoints, redeemPoints, normalizeCustomerId } from '@/lib/loyalty'

// GET /api/loyalty/account/[customerId]?email=&name= — hesap + işlemler
export async function GET(req: NextRequest, { params }: { params: { customerId: string } }) {
  const { error } = await requirePermission('customers.view')
  if (error) return error
  const customerId = decodeURIComponent(params.customerId)
  const email = req.nextUrl.searchParams.get('email')
  const name = req.nextUrl.searchParams.get('name')
  const account = await getOrCreateAccount(customerId, { email, name })
  const transactions = await prisma.loyaltyTransaction.findMany({ where: { accountId: account.id }, orderBy: { createdAt: 'desc' }, take: 50 })
  return NextResponse.json({ success: true, account, transactions })
}

// POST /api/loyalty/account/[customerId] — { action:'adjust'|'redeem', points, reason? }
export async function POST(req: NextRequest, { params }: { params: { customerId: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, message: 'Oturum yok' }, { status: 401 })
  const customerId = decodeURIComponent(params.customerId)
  const b = await req.json().catch(() => ({}))

  const acc = await prisma.loyaltyAccount.findUnique({ where: { shopifyCustomerId: normalizeCustomerId(customerId) } })
  if (!acc) return NextResponse.json({ success: false, message: 'Hesap bulunamadı (önce GET ile oluştur)' }, { status: 404 })
  const points = Math.floor(Number(b.points) || 0)

  try {
    if (b.action === 'adjust') {
      if (user.role !== 'ADMIN' && user.role !== 'MANAGER') return NextResponse.json({ success: false, message: 'Yetki yok' }, { status: 403 })
      if (!points) return NextResponse.json({ success: false, message: 'Puan gerekli (+/-)' }, { status: 400 })
      const updated = await adjustPoints(acc.id, points, String(b.reason || 'Manuel düzeltme'))
      await logAuditAuto('loyalty.adjust', { req, resource: `loyalty:${acc.id}`, detail: { points, reason: b.reason } })
      return NextResponse.json({ success: true, account: updated, message: `${points > 0 ? '+' : ''}${points} puan işlendi` })
    }
    if (b.action === 'redeem') {
      const r = await redeemPoints(acc.id, points)
      await logAuditAuto('loyalty.redeem', { req, resource: `loyalty:${acc.id}`, detail: { points, code: r.code, amount: r.amount } })
      return NextResponse.json({ success: true, account: r.account, code: r.code, amount: r.amount, message: `${points} puan → ${r.amount}₺ kupon: ${r.code}` })
    }
    return NextResponse.json({ success: false, message: 'Geçersiz action' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 400 })
  }
}
