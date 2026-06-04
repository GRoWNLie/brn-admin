import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'

// GET /api/einvoice/dashboard — özet sayılar + son hata logları
export async function GET() {
  const { error } = await requirePermission('orders.view')
  if (error) return error

  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const issued = { status: { in: ['APPROVED', 'SENT'] } }

  try {
    const [today, month, pending, errorCount, efatura, earsiv, cancelled, total, recentErrors] = await Promise.all([
      prisma.eInvoice.count({ where: { ...issued, sentAt: { gte: startOfDay } } }),
      prisma.eInvoice.count({ where: { ...issued, sentAt: { gte: startOfMonth } } }),
      prisma.eInvoice.count({ where: { status: 'DRAFT' } }),
      prisma.eInvoice.count({ where: { status: 'ERROR' } }),
      prisma.eInvoice.count({ where: { invoiceType: 'EFATURA' } }),
      prisma.eInvoice.count({ where: { invoiceType: 'EARSIV' } }),
      prisma.eInvoice.count({ where: { status: 'CANCELLED' } }),
      prisma.eInvoice.count(),
      prisma.invoiceLog.findMany({ where: { level: 'error' }, orderBy: { createdAt: 'desc' }, take: 25 }),
    ])

    return NextResponse.json({
      success: true,
      stats: { today, month, pending, error: errorCount, efatura, earsiv, cancelled, total },
      errors: recentErrors,
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}
