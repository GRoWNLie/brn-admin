/**
 * Pazaryeri adaptör registry — DB'deki MarketplaceIntegration kaydından
 * doğru adaptörü üretir.
 */
import { prisma } from '@/lib/prisma'
import { MarketplaceAdapter, MarketplaceCode, MarketplaceCredentials } from './types'
import { TrendyolAdapter } from './trendyol'
import { HepsiburadaAdapter } from './hepsiburada'
import { AmazonAdapter } from './amazon'
import { EtsyAdapter } from './etsy'

export * from './types'

function buildCredentials(row: {
  apiKey: string | null; apiSecret: string | null; sellerId: string | null; extra: string | null
}): MarketplaceCredentials {
  let extra: Record<string, unknown> = {}
  if (row.extra) { try { extra = JSON.parse(row.extra) } catch {} }
  return { apiKey: row.apiKey, apiSecret: row.apiSecret, sellerId: row.sellerId, extra }
}

export function createAdapter(code: MarketplaceCode, cred: MarketplaceCredentials): MarketplaceAdapter {
  switch (code) {
    case 'TRENDYOL': return new TrendyolAdapter(cred)
    case 'HEPSIBURADA': return new HepsiburadaAdapter(cred)
    case 'AMAZON': return new AmazonAdapter(cred)
    case 'ETSY': return new EtsyAdapter(cred)
    default: throw new Error('Bilinmeyen pazaryeri: ' + code)
  }
}

/** DB'den entegrasyonu yükleyip adaptörü döner (yoksa null). */
export async function getAdapterFromDb(code: MarketplaceCode): Promise<{
  adapter: MarketplaceAdapter
  integration: Awaited<ReturnType<typeof prisma.marketplaceIntegration.findUnique>>
} | null> {
  const integration = await prisma.marketplaceIntegration.findUnique({ where: { marketplace: code } })
  if (!integration) return null
  const adapter = createAdapter(code, buildCredentials(integration))
  return { adapter, integration }
}

export function isMarketplaceCode(v: string): v is MarketplaceCode {
  return ['TRENDYOL', 'HEPSIBURADA', 'AMAZON', 'ETSY'].includes(v)
}
