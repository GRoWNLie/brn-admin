/**
 * Repricing / Buybox otomasyon motoru.
 * Etkin kurallar için pazaryerinden buybox verisini çeker, hedef fiyatı hesaplar
 * (min/max sınırları içinde) ve pazaryerine iter. Stok değişmez (mevcut stok korunur).
 */
import { prisma } from './prisma'
import { getProducts } from './shopify-data'
import { getAdapterFromDb, MarketplaceCode, StockPriceItem } from './marketplace'

export interface RepriceResult {
  marketplace: string
  changed: number
  skipped: number
  details: Array<{ sku: string; from: number | null; to: number; reason: string }>
  message?: string
}

export async function runRepricing(): Promise<RepriceResult[]> {
  const rules = await prisma.repricingRule.findMany({ where: { enabled: true } })
  if (rules.length === 0) return []
  type Rule = (typeof rules)[number]

  // Pazaryerine göre grupla
  const byMp = new Map<string, Rule[]>()
  for (const r of rules) {
    const arr = byMp.get(r.marketplace) || []
    arr.push(r); byMp.set(r.marketplace, arr)
  }

  // Mevcut stoğu Shopify'dan al (repricing stoğu değiştirmesin)
  const shop = await getProducts({ first: 100 })
  const stockBySku = new Map<string, { barcode: string | null; qty: number }>()
  for (const p of shop.products) if (p.sku) stockBySku.set(p.sku, { barcode: p.barcode, qty: p.totalInventory ?? 0 })

  const out: RepriceResult[] = []

  for (const [mp, mpRules] of Array.from(byMp.entries())) {
    const loaded = await getAdapterFromDb(mp as MarketplaceCode)
    if (!loaded) { out.push({ marketplace: mp, changed: 0, skipped: 0, details: [], message: 'yapılandırılmamış' }); continue }

    const ruleSkus = mpRules.filter(r => r.sku).map(r => r.sku!) as string[]
    let buybox
    try {
      buybox = await loaded.adapter.fetchBuybox(ruleSkus)
    } catch (e: any) {
      out.push({ marketplace: mp, changed: 0, skipped: 0, details: [], message: e?.message || 'buybox alınamadı' })
      continue
    }

    const updates: StockPriceItem[] = []
    const details: RepriceResult['details'] = []
    let skipped = 0

    for (const b of buybox) {
      if (!b.sku) { skipped++; continue }
      const rule = mpRules.find(r => r.sku === b.sku) || mpRules.find(r => !r.sku)
      if (!rule) { skipped++; continue }

      // Hedef fiyat
      let target: number | null = null
      if (rule.strategy === 'fixed') {
        target = rule.fixedPrice ?? null
      } else if (b.buyboxPrice != null) {
        target = rule.strategy === 'beat_by' ? b.buyboxPrice - (rule.beatAmount ?? 0.01) : b.buyboxPrice
      }
      if (target == null) { skipped++; continue } // rakip/buybox verisi yok → atla

      // min/max sınırları
      if (rule.minPrice != null) target = Math.max(target, rule.minPrice)
      if (rule.maxPrice != null) target = Math.min(target, rule.maxPrice)
      target = Math.round(target * 100) / 100

      if (b.ourPrice != null && Math.abs(target - b.ourPrice) < 0.01) { skipped++; continue } // değişiklik yok

      const st = stockBySku.get(b.sku)
      updates.push({ sku: b.sku, barcode: b.barcode ?? st?.barcode ?? null, quantity: st?.qty ?? 0, salePrice: target })
      details.push({ sku: b.sku, from: b.ourPrice, to: target, reason: rule.strategy })
    }

    let changed = 0
    if (updates.length > 0) {
      const r = await loaded.adapter.syncStockPrice(updates)
      changed = r.ok ? updates.length : 0
    }

    // Kuralların son çalışma bilgisini güncelle
    await prisma.repricingRule.updateMany({
      where: { marketplace: mp, enabled: true },
      data: { lastRunAt: new Date(), lastAction: `${changed} fiyat güncellendi (${details.map(d => `${d.sku}:${d.to}`).slice(0, 10).join(', ')})` },
    }).catch(() => {})

    out.push({ marketplace: mp, changed, skipped, details })
  }

  return out
}
