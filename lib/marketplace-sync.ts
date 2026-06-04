/**
 * Pazaryeri senkron yardımcıları — cron, webhook ve manuel tetikleme paylaşır.
 */
import { prisma } from './prisma'
import { getProducts } from './shopify-data'
import { getAdapterFromDb, MarketplaceCode, StockPriceItem } from './marketplace'

export async function getEnabledMarketplaces() {
  return prisma.marketplaceIntegration.findMany({ where: { enabled: true } })
}

/**
 * Shopify ürünlerini etkin pazaryerlerine stok+fiyat olarak iter.
 * opts.skus verilirse sadece o SKU'lar senkronlanır (webhook tek ürün için).
 */
export async function syncStockPriceToMarketplaces(opts?: { skus?: string[] }): Promise<{
  synced: number
  results: Array<{ marketplace: string; ok: boolean; message: string }>
}> {
  const enabled = await getEnabledMarketplaces()
  if (enabled.length === 0) return { synced: 0, results: [] }

  const data = await getProducts({ first: 100 })
  let products = data.products
  if (opts?.skus?.length) {
    const set = new Set(opts.skus)
    products = products.filter(p => p.sku && set.has(p.sku))
  }
  const items: StockPriceItem[] = products.map(p => ({
    barcode: p.barcode, sku: p.sku,
    quantity: p.totalInventory ?? 0, salePrice: parseFloat(p.price) || 0,
  }))

  const results: Array<{ marketplace: string; ok: boolean; message: string }> = []
  for (const intg of enabled) {
    const loaded = await getAdapterFromDb(intg.marketplace as MarketplaceCode)
    if (!loaded) continue
    try {
      const r = await loaded.adapter.syncStockPrice(items)
      results.push({ marketplace: intg.marketplace, ok: r.ok, message: r.message })
      await prisma.marketplaceIntegration.update({ where: { marketplace: intg.marketplace }, data: { lastSyncAt: new Date() } }).catch(() => {})
    } catch (e: any) {
      results.push({ marketplace: intg.marketplace, ok: false, message: e?.message || 'hata' })
    }
  }
  return { synced: results.filter(r => r.ok).length, results }
}

/** Etkin tüm pazaryerlerinden siparişleri çekip DB'ye yazar. */
export async function pullAllMarketplaceOrders(sinceDays = 7): Promise<Array<{ marketplace: string; ok: boolean; count?: number; message?: string }>> {
  const enabled = await getEnabledMarketplaces()
  const results: Array<{ marketplace: string; ok: boolean; count?: number; message?: string }> = []
  for (const intg of enabled) {
    const loaded = await getAdapterFromDb(intg.marketplace as MarketplaceCode)
    if (!loaded) continue
    try {
      const orders = await loaded.adapter.fetchOrders({ sinceDays })
      let saved = 0
      for (const o of orders) {
        await prisma.marketplaceOrder.upsert({
          where: { marketplace_orderNumber: { marketplace: intg.marketplace, orderNumber: o.orderNumber } },
          create: {
            marketplace: intg.marketplace, orderNumber: o.orderNumber, status: o.status,
            customerName: o.customerName, total: o.total, currency: o.currency, lineCount: o.lineCount,
            orderedAt: o.orderedAt ? new Date(o.orderedAt) : null, raw: JSON.stringify(o.raw ?? {}),
          },
          update: { status: o.status, total: o.total, lineCount: o.lineCount },
        }).catch(() => {})
        saved++
      }
      results.push({ marketplace: intg.marketplace, ok: true, count: saved })
    } catch (e: any) {
      results.push({ marketplace: intg.marketplace, ok: false, message: e?.message || 'hata' })
    }
  }
  return results
}
