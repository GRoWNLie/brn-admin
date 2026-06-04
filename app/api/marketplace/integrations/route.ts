import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { logAuditAuto } from '@/lib/audit'
import { isMarketplaceCode, MARKETPLACES } from '@/lib/marketplace'

/** Kimlik bilgilerini maskele — client'a secret gönderme. */
function mask(row: any) {
  return {
    marketplace: row.marketplace,
    enabled: row.enabled,
    sellerId: row.sellerId,
    hasApiKey: !!row.apiKey,
    hasApiSecret: !!row.apiSecret,
    autoStock: row.autoStock,
    autoPrice: row.autoPrice,
    status: row.status,
    statusMessage: row.statusMessage,
    lastSyncAt: row.lastSyncAt,
    updatedAt: row.updatedAt,
  }
}

// GET /api/marketplace/integrations — tüm pazaryerleri (config maskeli)
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, message: 'Oturum yok' }, { status: 401 })
  const rows = await prisma.marketplaceIntegration.findMany()
  const byCode = new Map(rows.map(r => [r.marketplace, r]))
  // Tüm pazaryerleri için satır döndür (kayıt yoksa boş şablon)
  const integrations = MARKETPLACES.map(m => {
    const row = byCode.get(m.code)
    return row ? mask(row) : {
      marketplace: m.code, enabled: false, sellerId: null,
      hasApiKey: false, hasApiSecret: false, autoStock: true, autoPrice: true,
      status: 'DISCONNECTED', statusMessage: null, lastSyncAt: null, updatedAt: null,
    }
  })
  return NextResponse.json({ success: true, integrations })
}

// POST /api/marketplace/integrations — kimlik/ayar kaydet (ADMIN)
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, message: 'Oturum yok' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ success: false, message: 'Sadece ADMIN yapılandırabilir' }, { status: 403 })

  const b = await req.json().catch(() => ({}))
  const mp = String(b.marketplace || '')
  if (!isMarketplaceCode(mp)) return NextResponse.json({ success: false, message: 'Geçersiz pazaryeri' }, { status: 400 })

  // Sadece gönderilen alanları güncelle (boş secret mevcut secret'i silmesin)
  const data: any = {}
  if (b.apiKey !== undefined && b.apiKey !== '') data.apiKey = String(b.apiKey)
  if (b.apiSecret !== undefined && b.apiSecret !== '') data.apiSecret = String(b.apiSecret)
  if (b.sellerId !== undefined) data.sellerId = b.sellerId ? String(b.sellerId) : null
  if (typeof b.enabled === 'boolean') data.enabled = b.enabled
  if (typeof b.autoStock === 'boolean') data.autoStock = b.autoStock
  if (typeof b.autoPrice === 'boolean') data.autoPrice = b.autoPrice

  // extra (refreshToken, marketplaceId, region vb.) — mevcut değerlerle MERGE et,
  // boş gönderilen alanlar eskiyi silmesin
  const existing = await prisma.marketplaceIntegration.findUnique({ where: { marketplace: mp } })
  if (b.extra && typeof b.extra === 'object') {
    let cur: Record<string, unknown> = {}
    if (existing?.extra) { try { cur = JSON.parse(existing.extra) } catch {} }
    for (const [k, v] of Object.entries(b.extra)) {
      if (v !== undefined && v !== null && String(v).trim() !== '') cur[k] = String(v).trim()
    }
    data.extra = Object.keys(cur).length ? JSON.stringify(cur) : null
  }

  const row = await prisma.marketplaceIntegration.upsert({
    where: { marketplace: mp },
    create: { marketplace: mp, ...data },
    update: data,
  })

  await logAuditAuto('marketplace.config', {
    req, resource: `marketplace:${mp}`,
    detail: { enabled: row.enabled, autoStock: row.autoStock, autoPrice: row.autoPrice, sellerSet: !!row.sellerId },
  })

  return NextResponse.json({ success: true, integration: mask(row) })
}
