import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { blockInProduction } from '@/lib/debug-guard'

/**
 * POST /api/admin/promote-me
 *
 * Giriş yapmış kullanıcıyı ADMIN yapar.
 * GÜVENLİK: Sadece sistemde 0 veya 1 ADMIN varsa çalışır (bootstrap).
 * Production'da bu endpoint kaldırılmalı veya bir SECRET key ile korunmalı.
 */
export async function POST(req: NextRequest) {
  const blocked = blockInProduction(); if (blocked) return blocked
  const session: any = await getServerSession()

  if (!session?.user?.email) {
    return NextResponse.json(
      { success: false, message: 'Giriş yapmamışsın. Önce /login\'den giriş yap.' },
      { status: 401 }
    )
  }

  try {
    // Güvenlik: zaten birden fazla ADMIN varsa bu endpoint çalışmaz
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } })

    if (adminCount > 1) {
      return NextResponse.json({
        success: false,
        message: 'Birden fazla ADMIN var. Manuel rol ataması için /team sayfasını kullan (mevcut bir ADMIN ile giriş yap).',
      }, { status: 403 })
    }

    const me = await prisma.user.update({
      where: { email: session.user.email },
      data: { role: 'ADMIN' },
    })

    return NextResponse.json({
      success: true,
      message: `✅ ${me.email} artık ADMIN. Çıkış yap + tekrar giriş yap (yeni rol token'a yansısın).`,
      user: { id: me.id, email: me.email, role: me.role },
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}

// GET ile durumu göster
export async function GET() {
  const blocked = blockInProduction(); if (blocked) return blocked
  const session: any = await getServerSession()
  const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } })
  const totalUsers = await prisma.user.count()
  return NextResponse.json({
    success: true,
    loggedInAs: session?.user?.email ?? null,
    currentRole: session?.user?.role ?? null,
    adminCount,
    totalUsers,
    canPromote: adminCount <= 1,
    hint: 'POST atarsan kendini ADMIN yapar (sadece sistemde ≤1 ADMIN varsa).',
  })
}
