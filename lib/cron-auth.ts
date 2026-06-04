import { NextRequest, NextResponse } from 'next/server'
import { getSetting } from './app-settings'

/**
 * Cron endpoint'lerini korur.
 * Geçerli ise null döner; değilse 401/403 NextResponse döner.
 *
 * Vercel Cron, CRON_SECRET tanımlıysa otomatik "Authorization: Bearer {secret}" gönderir.
 * Harici scheduler için ?secret=... query de kabul edilir.
 */
export async function verifyCron(req: NextRequest): Promise<NextResponse | null> {
  const secret = await getSetting('CRON_SECRET')
  if (!secret) {
    // Secret yoksa: dev'de serbest, production'da kapalı
    if (process.env.NODE_ENV !== 'production') return null
    return NextResponse.json({ success: false, message: 'CRON_SECRET tanımlı değil (Ayarlar → API).' }, { status: 403 })
  }
  const auth = req.headers.get('authorization') || ''
  const qs = req.nextUrl.searchParams.get('secret') || ''
  if (auth === `Bearer ${secret}` || qs === secret) return null
  return NextResponse.json({ success: false, message: 'Yetkisiz cron isteği.' }, { status: 401 })
}
