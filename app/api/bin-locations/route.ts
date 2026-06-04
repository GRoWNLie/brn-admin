import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAuditAuto } from '@/lib/audit'

/**
 * GET /api/bin-locations           → tüm lokasyonlar
 * GET /api/bin-locations?skus=a,b,c → sadece bu SKU'lar için { sku: location } haritası
 */
export async function GET(req: NextRequest) {
  const skusParam = req.nextUrl.searchParams.get('skus')
  try {
    if (skusParam) {
      const skus = skusParam.split(',').map(s => s.trim()).filter(Boolean).slice(0, 250)
      const rows = await prisma.binLocation.findMany({ where: { sku: { in: skus } } })
      const map: Record<string, string> = {}
      rows.forEach(r => { map[r.sku] = r.location })
      return NextResponse.json({ success: true, map })
    }
    const rows = await prisma.binLocation.findMany({ orderBy: { location: 'asc' } })
    return NextResponse.json({ success: true, locations: rows })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message, map: {} }, { status: 200 })
  }
}

/**
 * POST /api/bin-locations — elle lokasyon ata/güncelle
 * Body: { sku, location, title? }
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const sku = typeof body.sku === 'string' ? body.sku.trim() : ''
  const location = typeof body.location === 'string' ? body.location.trim().slice(0, 60) : ''
  if (!sku) return NextResponse.json({ success: false, message: 'sku gerekli' }, { status: 400 })
  try {
    if (!location) {
      // boş lokasyon → kaydı sil
      await prisma.binLocation.deleteMany({ where: { sku } })
      await logAuditAuto('bin_location.delete', { req, resource: `sku:${sku}` })
      return NextResponse.json({ success: true, deleted: true })
    }
    const row = await prisma.binLocation.upsert({
      where: { sku },
      create: { sku, location, title: body.title || null },
      update: { location, title: body.title || null },
    })
    await logAuditAuto('bin_location.set', { req, resource: `sku:${sku}`, detail: { location } })
    return NextResponse.json({ success: true, location: row })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}
