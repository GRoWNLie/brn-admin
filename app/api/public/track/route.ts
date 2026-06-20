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
 * İlk kayıtta IP ve şehir bilgisi de saklanır.
 */
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  const sid = typeof b.sid === 'string' ? b.sid.slice(0, 80) : ''
  if (!sid) return corsJson(req, { success: false, message: 'sid gerekli' }, { status: 400 })

  const path = typeof b.path === 'string' ? b.path.slice(0, 500) : null
  const referrer = typeof b.referrer === 'string' ? b.referrer.slice(0, 500) : null
  const userAgent = (req.headers.get('user-agent') || '').slice(0, 500) || null

  const rawIp = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim()
    || req.headers.get('x-real-ip')
    || ''
  const ip = rawIp.slice(0, 45) || null

  try {
    // Oturum daha önce var mı kontrol et
    const existing = await prisma.visitorSession.findUnique({ where: { id: sid }, select: { id: true, city: true } })

    if (!existing) {
      // İlk ziyaret: geoip lookup yap
      let city: string | null = null
      let country: string | null = null
      if (ip && !ip.startsWith('127.') && !ip.startsWith('::1') && !ip.startsWith('192.168.') && !ip.startsWith('10.')) {
        try {
          const geo = await fetch(`http://ip-api.com/json/${ip}?fields=status,city,countryCode`, {
            signal: AbortSignal.timeout(1500),
          })
          const geoData = await geo.json()
          if (geoData.status === 'success') {
            city = geoData.city ?? null
            country = geoData.countryCode ?? null
          }
        } catch {}
      }
      await prisma.visitorSession.create({
        data: { id: sid, path, referrer, userAgent, ip, city, country },
      })
    } else {
      // Sonraki ping: sadece path ve lastSeen güncelle
      await prisma.visitorSession.update({
        where: { id: sid },
        data: { path },
      })
    }

    // Eski kayıtları temizle (90 günden eski) — ~%2 ihtimalle çalıştır
    if (Math.random() < 0.02) {
      const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      prisma.visitorSession.deleteMany({ where: { lastSeen: { lt: cutoff } } }).catch(() => {})
    }

    return corsJson(req, { success: true })
  } catch (e: any) {
    return corsJson(req, { success: false, message: e?.message }, { status: 500 })
  }
}
