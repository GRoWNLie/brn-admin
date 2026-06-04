import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

const VALID_ROLES: Role[] = ['ADMIN', 'MANAGER', 'EDITOR', 'VIEWER']

/** GET /api/team — kullanıcı listesi */
export async function GET() {
  const { user, error } = await requirePermission('team.manage')
  if (error) return error

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true, updatedAt: true },
  })
  return NextResponse.json({ success: true, users })
}

/** POST /api/team — yeni kullanıcı ekle */
export async function POST(req: NextRequest) {
  const { user, error } = await requirePermission('team.manage')
  if (error) return error

  const body = await req.json().catch(() => ({}))
  const { name, email, password, role } = body

  if (!name || !email || !password) {
    return NextResponse.json({ success: false, message: 'name, email, password zorunlu' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ success: false, message: 'Şifre en az 6 karakter olmalı' }, { status: 400 })
  }
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ success: false, message: 'Geçersiz rol' }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ success: false, message: 'Bu e-posta zaten kayıtlı' }, { status: 409 })
  }

  const hash = await bcrypt.hash(password, 10)
  const created = await prisma.user.create({
    data: { name, email, password: hash, role, active: true },
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
  })

  await logAudit({
    userId: user.id, userEmail: user.email!,
    action: 'team.create_user',
    resource: `user:${created.id}`,
    detail: { name, email, role },
    req,
  })

  return NextResponse.json({ success: true, user: created }, { status: 201 })
}
