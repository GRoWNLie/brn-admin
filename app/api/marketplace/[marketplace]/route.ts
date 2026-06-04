import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { logAuditAuto } from '@/lib/audit'
import { getProducts } from '@/lib/shopify-data'
import { getAdapterFromDb, isMarketplaceCode, MarketplaceCode, StockPriceItem } from '@/lib/marketplace'

// GET /api/marketplace/[marketplace]?resource=orders|buybox|listings
export async function GET(req: NextRequest, { params }: { params: { marketplace: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, message: 'Oturum yok' }, { status: 401 })
  const mp = params.marketplace.toUpperCase()
  if (!isMarketplaceCode(mp)) return NextResponse.json({ success: false, message: 'Geçersiz pazaryeri' }, { status: 400 })
  const resource = req.nextUrl.searchParams.get('resource') || 'listings'

  if (resource === 'orders') {
    const orders = await prisma.marketplaceOrder.findMany({
      where: { marketplace: mp }, orderBy: { orderedAt: 'desc' }, take: 200,
    })
    return NextResponse.json({ success: true, orders })
  }
  // buybox + listings aynı tablodan
  const listings = await prisma.marketplaceListing.findMany({
    where: { marketplace: mp }, orderBy: { buyboxCheckedAt: 'desc' }, take: 500,
  })
  return NextResponse.json({ success: true, listings })
}

// POST /api/marketplace/[marketplace] — Body: { action: 'test'|'sync'|'orders'|'buybox'|'list', ... }
export async function POST(req: NextRequest, { params }: { params: { marketplace: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, message: 'Oturum yok' }, { status: 401 })
  const mp = params.marketplace.toUpperCase()
  if (!isMarketplaceCode(mp)) return NextResponse.json({ success: false, message: 'Geçersiz pazaryeri' }, { status: 400 })

  const loaded = await getAdapterFromDb(mp as MarketplaceCode)
  if (!loaded) return NextResponse.json({ success: false, message: 'Önce pazaryeri yapılandırılmalı.' }, { status: 400 })
  const { adapter } = loaded
  const body = await req.json().catch(() => ({}))
  const action = String(body.action || '')

  try {
    // ── Bağlantı testi ──
    if (action === 'test') {
      const r = await adapter.testConnection()
      await prisma.marketplaceIntegration.update({
        where: { marketplace: mp },
        data: { status: r.ok ? 'CONNECTED' : 'ERROR', statusMessage: r.message },
      })
      await logAuditAuto('marketplace.test', { req, resource: `marketplace:${mp}`, detail: { ok: r.ok } })
      return NextResponse.json({ success: r.ok, message: r.message })
    }

    // ── Stok & fiyat senkronu (Shopify → pazaryeri) ──
    if (action === 'sync') {
      const data = await getProducts({ first: 100 })
      const items: StockPriceItem[] = data.products.map(p => ({
        barcode: p.barcode, sku: p.sku,
        quantity: p.totalInventory ?? 0,
        salePrice: parseFloat(p.price) || 0,
      }))
      const r = await adapter.syncStockPrice(items)

      // Listing kayıtlarını güncelle
      for (const p of data.products) {
        if (!p.sku) continue
        await prisma.marketplaceListing.upsert({
          where: { marketplace_sku: { marketplace: mp, sku: p.sku } },
          create: {
            marketplace: mp, sku: p.sku, barcode: p.barcode, title: p.title,
            shopifyProductId: p.id, price: parseFloat(p.price) || 0, stock: p.totalInventory ?? 0,
            ourPrice: parseFloat(p.price) || 0, status: r.ok ? 'LISTED' : 'ERROR', lastSyncAt: new Date(),
          },
          update: {
            barcode: p.barcode, title: p.title, price: parseFloat(p.price) || 0,
            stock: p.totalInventory ?? 0, ourPrice: parseFloat(p.price) || 0,
            status: r.ok ? 'LISTED' : 'ERROR', lastSyncAt: new Date(),
          },
        }).catch(() => {})
      }
      await prisma.marketplaceIntegration.update({ where: { marketplace: mp }, data: { lastSyncAt: new Date() } })
      await logAuditAuto('marketplace.sync', { req, resource: `marketplace:${mp}`, detail: { count: items.length, ok: r.ok } })
      return NextResponse.json({ success: r.ok, message: r.message, batchId: r.batchId })
    }

    // ── Sipariş çekme ──
    if (action === 'orders') {
      const orders = await adapter.fetchOrders({ sinceDays: body.sinceDays ?? 14 })
      let saved = 0
      for (const o of orders) {
        await prisma.marketplaceOrder.upsert({
          where: { marketplace_orderNumber: { marketplace: mp, orderNumber: o.orderNumber } },
          create: {
            marketplace: mp, orderNumber: o.orderNumber, status: o.status, customerName: o.customerName,
            total: o.total, currency: o.currency, lineCount: o.lineCount,
            orderedAt: o.orderedAt ? new Date(o.orderedAt) : null, raw: JSON.stringify(o.raw ?? {}),
          },
          update: { status: o.status, total: o.total, lineCount: o.lineCount },
        }).catch(() => {})
        saved++
      }
      await logAuditAuto('marketplace.orders_fetch', { req, resource: `marketplace:${mp}`, detail: { fetched: saved } })
      return NextResponse.json({ success: true, message: `${saved} sipariş çekildi.`, count: saved })
    }

    // ── Buybox verisi çekme ──
    if (action === 'buybox') {
      const rows = await adapter.fetchBuybox(Array.isArray(body.barcodes) ? body.barcodes : [])
      let saved = 0
      for (const r of rows) {
        if (!r.sku) continue
        await prisma.marketplaceListing.upsert({
          where: { marketplace_sku: { marketplace: mp, sku: r.sku } },
          create: {
            marketplace: mp, sku: r.sku, barcode: r.barcode, title: r.title,
            ourPrice: r.ourPrice, buyboxPrice: r.buyboxPrice, buyboxWinner: r.isWinner,
            sellerCount: r.sellerCount, buyboxCheckedAt: new Date(),
          },
          update: {
            title: r.title, barcode: r.barcode, ourPrice: r.ourPrice, buyboxPrice: r.buyboxPrice,
            buyboxWinner: r.isWinner, sellerCount: r.sellerCount, buyboxCheckedAt: new Date(),
          },
        }).catch(() => {})
        saved++
      }
      await logAuditAuto('marketplace.buybox_fetch', { req, resource: `marketplace:${mp}`, detail: { count: saved } })
      return NextResponse.json({ success: true, message: `${saved} ürün buybox verisi güncellendi.`, count: saved })
    }

    // ── Ürün listeleme (Shopify ürünü → pazaryeri) ──
    if (action === 'list') {
      const sku = body.sku ? String(body.sku) : null
      if (!sku) return NextResponse.json({ success: false, message: 'sku gerekli' }, { status: 400 })
      const data = await getProducts({ first: 100, search: sku })
      const p = data.products.find(x => x.sku === sku) || data.products[0]
      if (!p) return NextResponse.json({ success: false, message: 'Ürün bulunamadı' }, { status: 404 })
      const r = await adapter.listProduct({
        title: p.title, sku: p.sku, barcode: p.barcode,
        price: parseFloat(p.price) || 0, stock: p.totalInventory ?? 0,
        images: p.image ? [p.image] : [],
      })
      await logAuditAuto('marketplace.list_product', { req, resource: `marketplace:${mp}`, detail: { sku, ok: r.ok } })
      return NextResponse.json({ success: r.ok, message: r.message, batchId: r.batchId })
    }

    return NextResponse.json({ success: false, message: 'Geçersiz action' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 })
  }
}
