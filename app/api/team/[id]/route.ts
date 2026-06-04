import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

const VALID_ROLES: Role[] = ['ADMIN', 'MANAGER', 'EDITOR', 'VIEWER']

/** PATCH /api/team/[id] — rol/aktiflik/şifre güncelle */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requirePermission('team.manage')
  if (error) return error

  const targetId = parseInt(params.id, 10)
  if (isNaN(targetId)) {
    return NextResponse.json({ success: false, message: 'Geçersiz id' }, { status: 400 })
  }

  const body = await req.json().catch(() => ({}))
  const data: Record<string, unknown> = {}

  if (body.role !== undefined) {
    if (!VALID_ROLES.includes(body.role)) {
      return NextResponse.json({ success: false, message: 'Geçersiz rol' }, { status: 400 })
    }
    data.role = body.role
  }
  if (body.active !== undefined) data.active = !!body.active
  if (body.name !== undefined) data.name = String(body.name)
  if (body.password !== undefined && body.password) {
    if (String(body.password).length < 6) {
      return NextResponse.json({ success: false, message: 'Şifre en az 6 karakter olmalı' }, { status: 400 })
    }
    data.password = await bcrypt.hash(body.password, 10)
  }

  // Kendini admin'den düşürme ya da pasif etme güvenliği
  if (parseInt(user.id, 10) === targetId) {
    if (data.role && data.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Kendi rolünüzü ADMIN\'den düşüremezsiniz' }, { status: 400 })
    }
    if (data.active === false) {
      return NextResponse.json({ success: false, message: 'Kendi hesabınızı pasif edemezsiniz' }, { status: 400 })
    }
  }

  // Son ADMIN kontrolü
  if (data.role && data.role !== 'ADMIN') {
    const target = await prisma.user.findUnique({ where: { id: targetId }, select: { role: true } })
    if (target?.role === 'ADMIN') {
      const adminCount = await prisma.user.count({ where: { role: 'ADMIN', active: true } })
      if (adminCount <= 1) {
        return NextResponse.json({ success: false, message: 'En az bir aktif ADMIN olmalı' }, { status: 400 })
      }
    }
  }
  if (data.active === false) {
    const target = await prisma.user.findUnique({ where: { id: targetId }, select: { role: true } })
    if (target?.role === 'ADMIN') {
      const adminCount = await prisma.user.count({ where: { role: 'ADMIN', active: true } })
      if (adminCount <= 1) {
        return NextResponse.json({ success: false, message: 'En az bir aktif ADMIN olmalı' }, { status: 400 })
      }
    }
  }

  const updated = await prisma.user.update({
    where: { id: targetId },
    data,
    select: { id: true, name: true, email: true, role: true, active: true, updatedAt: true },
  })

  await logAudit({
    userId: user.id, userEmail: user.email!,
    action: 'team.update_user',
    resource: `user:${targetId}`,
    detail: { changes: { ...body, password: body.password ? '***' : undefined } },
    req,
  })

  return NextResponse.json({ success: true, user: updated })
}

/** DELETE /api/team/[id] — kullanıcıyı sil */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requirePermission('team.manage')
  if (error) return error

  const targetId = parseInt(params.id, 10)
  if (isNaN(targetId)) {
    return NextResponse.json({ success: false, message: 'Geçersiz id' }, { status: 400 })
  }
  if (parseInt(user.id, 10) === targetId) {
    return NextResponse.json({ success: false, message: 'Kendi hesabınızı silemezsiniz' }, { status: 400 })
  }

  const target = await prisma.user.findUnique({ where: { id: targetId }, select: { role: true, email: true } })
  if (!target) {
    return NextResponse.json({ success: false, message: 'Kullanıcı bulunamadı' }, { status: 404 })
  }
  if (target.role === 'ADMIN') {
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN', active: true } })
    if (adminCount <= 1) {
      return NextResponse.json({ success: false, message: 'En az bir aktif ADMIN olmalı' }, { status: 400 })
    }
  }

  await prisma.user.delete({ where: { id: targetId } })

  await logAudit({
    userId: user.id, userEmail: user.email!,
    action: 'team.delete_user',
    resource: `user:${targetId}`,
    detail: { email: target.email },
    req,
  })

  return NextResponse.json({ success: true })
}
