/**
 * Upsell & Cross-sell Motoru
 *
 * Kural tipleri:
 *  - source_type: "product" → belirli ürün, "tag" → etiket, "category" → ürün tipi, "any" → tümü
 *  - rule_type: "upsell" (üst kategori öner), "cross_sell" (yan ürün), "bump" (küçük ek)
 *  - placement: "cart", "product_page", "checkout", "post_purchase"
 */

import { prisma } from './prisma'

export interface MatchContext {
  productId?: string         // Shopify ürün GID
  productTags?: string[]
  productType?: string
  cartProductIds?: string[]
  placement?: string         // "cart" / "product_page" vs
}

/**
 * Verilen contexte uyan aktif upsell kurallarını döner,
 * priority sırasına göre.
 */
export async function matchUpsellRules(ctx: MatchContext) {
  const placement = ctx.placement || 'cart'

  const rules = await prisma.upsellRule.findMany({
    where: { active: true, placement },
    orderBy: { priority: 'desc' },
  })

  return rules.filter(r => matches(r, ctx))
}

function matches(rule: any, ctx: MatchContext): boolean {
  if (rule.sourceType === 'any') return true
  if (rule.sourceType === 'product' && ctx.productId) {
    return rule.sourceValue === ctx.productId
  }
  if (rule.sourceType === 'tag' && ctx.productTags) {
    return ctx.productTags.includes(rule.sourceValue ?? '')
  }
  if (rule.sourceType === 'category' && ctx.productType) {
    return rule.sourceValue === ctx.productType
  }
  return false
}

/** Show/Click/Purchase istatistiği güncelle */
export async function trackUpsellEvent(
  ruleId: number,
  event: 'show' | 'click' | 'purchase'
) {
  const field = event === 'show' ? 'showCount'
    : event === 'click' ? 'clickCount'
    : 'purchaseCount'
  await prisma.upsellRule.update({
    where: { id: ruleId },
    data: { [field]: { increment: 1 } },
  })
}
