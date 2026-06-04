import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { corsJson, corsPreflight } from '@/lib/cors'

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req)
}

/**
 * POST /api/public/track
 * Body: { sid: string, path?: string, referrer?: string }
 * Storefront beacon (tracker.js) her ~20 sn'de bir çağırır.
 * Oturumu upsert eder; lastSeen otomatik güncellenir.
 * Fırsat buldukça eski kayıtları (>1 saat) temizler.
 */
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  const sid = typeof b.sid === 'string' ? b.sid.slice(0, 80) : ''
  if (!sid) return corsJson(req, { success: false, message: 'sid gerekli' }, { status: 400 })

  const path = typeof b.path === 'string' ? b.path.slice(0, 500) : null
  const referrer = typeof b.referrer === 'string' ? b.referrer.slice(0, 500) : null
  const userAgent = (req.headers.get('user-agent') || '').slice(0, 500) || null

  try {
    await prisma.visitorSession.upsert({
      where: { id: sid },
      create: { id: sid, path, referrer, userAgent },
      update: { path },
    })

    // Eski kayıtları temizle (90 günden eski) — "Oturum" raporu için geçmiş korunur.
    // Yanıtı bekletme. Her ping'te değil, ~%2 ihtimalle çalıştır (yük azaltma).
    if (Math.random() < 0.02) {
      const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      prisma.visitorSession.deleteMany({ where: { lastSeen: { lt: cutoff } } }).catch(() => {})
    }

    return corsJson(req, { success: true })
  } catch (e: any) {
    return corsJson(req, { success: false, message: e?.message }, { status: 500 })
  }
}
