import { NextRequest, NextResponse } from 'next/server'
import { attemptLogin } from '@/lib/shopify-customer-account'
import { createSession } from '@/lib/storefront-session'
import { rateLimit, clientIp } from '@/lib/rate-limit'

// POST /api/storefront/[storeId]/login — { email, password }
export async function POST(req: NextRequest, { params }: { params: { storeId: string } }) {
  const storeId = Number(params.storeId)
  const rl = rateLimit(`sf_login:${clientIp(req)}:${storeId}`, 8, 60_000)
  if (!rl.ok) return NextResponse.json({ success: false, message: `Çok fazla deneme, ${Math.ceil(rl.resetIn / 1000)}sn sonra tekrar deneyin.` }, { status: 429 })

  const b = await req.json().catch(() => ({}))
  const r = await attemptLogin(storeId, String(b.email || ''), String(b.password || ''))
  if (!r.ok || !r.customerId) return NextResponse.json({ success: false, message: r.message }, { status: 401 })
  await createSession(storeId, r.customerId, r.accessToken ? { accessToken: r.accessToken } : undefined)
  return NextResponse.json({ success: true, message: r.message })
}
