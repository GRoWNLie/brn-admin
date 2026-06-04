import { NextResponse } from 'next/server'
import { destroySession } from '@/lib/storefront-session'

export async function POST(_req: Request, { params }: { params: { storeId: string } }) {
  await destroySession(Number(params.storeId))
  return NextResponse.json({ success: true })
}
