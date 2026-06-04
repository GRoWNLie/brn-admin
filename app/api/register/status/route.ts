import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/** GET /api/register/status — kayıt açık mı? (0 kullanıcı varsa açık) */
export async function GET() {
  try {
    const count = await prisma.user.count()
    return NextResponse.json({ allowRegister: count === 0 })
  } catch {
    return NextResponse.json({ allowRegister: false })
  }
}
