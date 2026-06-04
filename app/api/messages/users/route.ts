import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET /api/messages/users — DM/görev için kullanıcı listesi (kendisi hariç)
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, message: 'Oturum yok' }, { status: 401 })
  const me = Number(user.id)
  const users = await prisma.user.findMany({
    where: { active: true, id: { not: me } },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json({ success: true, users })
}
