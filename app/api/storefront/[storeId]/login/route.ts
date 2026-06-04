import { NextRequest, NextResponse } from 'next/server'
import { attemptLogin } from '@/lib/shopify-customer-account'
import { createSession } from '@/lib/storefront-session'

// POST /api/storefront/[storeId]/login — { email, password }
export async function POST(req: NextRequest, { params }: { params: { storeId: string } }) {
  const storeId = Number(params.storeId)
  const b = await req.json().catch(() => ({}))
  const r = await attemptLogin(storeId, String(b.email || ''), String(b.password || ''))
  if (!r.ok || !r.customerId) return NextResponse.json({ success: false, message: r.message }, { status: 401 })
  await createSession(storeId, r.customerId)
  return NextResponse.json({ success: true, message: r.message })
}
