import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

/**
 * Sadece SİSTEM BOŞKEN ilk admin'i oluşturmak için kullanılır.
 * Bir kullanıcı varsa kayıt KAPALI; yeni kullanıcılar admin tarafından /team sayfasından eklenir.
 */
export async function POST(req: NextRequest) {
  const { name, email, password } = await req.json()

  if (!name || !email || !password) {
    return NextResponse.json({ error: 'Tüm alanlar zorunludur.' }, { status: 400 })
  }

  const userCount = await prisma.user.count()
  if (userCount > 0) {
    return NextResponse.json(
      { error: 'Kayıt kapalı. Yeni kullanıcılar admin tarafından eklenir.' },
      { status: 403 }
    )
  }

  const hash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: { name, email, password: hash, role: 'ADMIN', active: true },
  })

  return NextResponse.json(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    { status: 201 }
  )
}
