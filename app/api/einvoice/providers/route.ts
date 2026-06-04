import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'
import { logAuditAuto } from '@/lib/audit'
import { encryptJson, decryptJson } from '@/lib/efatura/crypto'

function mask(row: any) {
  const cfg = decryptJson<Record<string, unknown>>(row.config) || {}
  return {
    id: row.id, name: row.name, type: row.type, enabled: row.enabled, mode: row.mode,
    invoiceTypes: row.invoiceTypes, isDefault: row.isDefault,
    // config: sadece hangi alanların dolu olduğu (secret değer dönmez)
    configFields: {
      username: !!cfg.username, hasPassword: !!cfg.password,
      hasCert: !!cfg.certPemBase64, apiUrl: cfg.apiUrl ?? null,
    },
    updatedAt: row.updatedAt,
  }
}

// GET — sağlayıcılar (maskeli)
export async function GET() {
  const { error } = await requirePermission('settings.manage')
  if (error) return error
  const rows = await prisma.efaturaProvider.findMany({ orderBy: { id: 'asc' } })
  return NextResponse.json({ success: true, providers: rows.map(mask) })
}

// POST — ekle/güncelle
export async function POST(req: NextRequest) {
  const { error } = await requirePermission('settings.manage')
  if (error) return error
  const b = await req.json().catch(() => ({}))
  if (!b.name) return NextResponse.json({ success: false, message: 'Ad gerekli' }, { status: 400 })

  // Mevcut config'i koru, gelen (boş olmayan) alanları üzerine yaz
  let cfg: Record<string, unknown> = {}
  if (b.id) {
    const ex = await prisma.efaturaProvider.findUnique({ where: { id: Number(b.id) } })
    if (ex?.config) cfg = decryptJson<Record<string, unknown>>(ex.config) || {}
  }
  for (const k of ['username', 'password', 'certPemBase64', 'certPassword', 'apiKey', 'apiUrl', 'liveEndpoint', 'testEndpoint']) {
    if (b[k] !== undefined && b[k] !== '') cfg[k] = String(b[k])
  }

  const data = {
    name: String(b.name).slice(0, 120),
    type: b.type || 'GIB',
    enabled: b.enabled !== false,
    mode: b.mode === 'live' ? 'live' : 'sandbox',
    invoiceTypes: b.invoiceTypes || 'EFATURA,EARSIV',
    isDefault: !!b.isDefault,
    config: encryptJson(cfg),
  }

  const row = b.id
    ? await prisma.efaturaProvider.update({ where: { id: Number(b.id) }, data })
    : await prisma.efaturaProvider.create({ data })

  // Tek default olsun
  if (data.isDefault) {
    await prisma.efaturaProvider.updateMany({ where: { id: { not: row.id } }, data: { isDefault: false } })
  }
  await logAuditAuto('einvoice.provider_save', { req, resource: `efatura_provider:${row.id}`, detail: { name: row.name, type: row.type, mode: row.mode } })
  return NextResponse.json({ success: true, provider: mask(row) })
}

// DELETE ?id=
export async function DELETE(req: NextRequest) {
  const { error } = await requirePermission('settings.manage')
  if (error) return error
  const id = Number(req.nextUrl.searchParams.get('id'))
  if (!id) return NextResponse.json({ success: false, message: 'id gerekli' }, { status: 400 })
  await prisma.efaturaProvider.delete({ where: { id } })
  await logAuditAuto('einvoice.provider_delete', { req, resource: `efatura_provider:${id}` })
  return NextResponse.json({ success: true })
}
