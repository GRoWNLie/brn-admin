import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'
import { logAuditAuto } from '@/lib/audit'
import { createStore, maskStore } from '@/lib/customer-dashboard'

// GET /api/customer-dashboard/stores — mağazaları listele (config maskeli)
export async function GET() {
  const { error } = await requirePermission('settings.manage')
  if (error) return error
  const stores = await prisma.store.findMany({ orderBy: { createdAt: 'asc' } })
  return NextResponse.json({ success: true, stores: stores.map(maskStore) })
}

// POST /api/customer-dashboard/stores — yeni mağaza
export async function POST(req: NextRequest) {
  const { error } = await requirePermission('settings.manage')
  if (error) return error
  const b = await req.json().catch(() => ({}))
  if (!b.name || !b.shopifyDomain || !b.slug) {
    return NextResponse.json({ success: false, message: 'slug, name ve shopifyDomain gerekli' }, { status: 400 })
  }
  // Şu an benzersizlik garantisi için unique constraint var; yine de okunabilir hata verelim
  const dupe = await prisma.store.findFirst({
    where: { OR: [{ slug: String(b.slug).toLowerCase() }, { shopifyDomain: b.shopifyDomain }] },
  })
  if (dupe) return NextResponse.json({ success: false, message: 'Bu slug veya domain zaten kayıtlı' }, { status: 409 })

  const store = await createStore({
    slug: String(b.slug), name: String(b.name).slice(0, 120),
    shopifyDomain: String(b.shopifyDomain), customDomain: b.customDomain ? String(b.customDomain) : null,
    config: { adminToken: b.adminToken, apiKey: b.apiKey, apiSecret: b.apiSecret, proxySecret: b.proxySecret },
  })
  await logAuditAuto('store.create', { req, resource: `store:${store.id}`, detail: { slug: store.slug, name: store.name } })
  return NextResponse.json({ success: true, store: maskStore(store) })
}


