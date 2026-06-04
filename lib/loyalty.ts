/**
 * Müşteri Sadakat Puan sistemi.
 * Kazanım: sipariş ödenince (webhook) tutar × pointsPerCurrency puan.
 * Kullanım: puan → Shopify sabit-tutar indirim kuponu (redeemValue ile).
 * Seviyeler (tier): toplam kazanılan puana göre BRONZE/SILVER/GOLD.
 */
import { prisma } from './prisma'
import { createDiscountBasic } from './shopify-commerce'

export function normalizeCustomerId(id: string): string {
  return (id || '').split('/').pop() || id
}

export async function getLoyaltySettings() {
  let s = await prisma.loyaltySetting.findFirst()
  if (!s) s = await prisma.loyaltySetting.create({ data: {} })
  return s
}

export function tierOf(totalEarned: number, s: { silverThreshold: number; goldThreshold: number }): string {
  if (totalEarned >= s.goldThreshold) return 'GOLD'
  if (totalEarned >= s.silverThreshold) return 'SILVER'
  return 'BRONZE'
}

export async function getOrCreateAccount(customerId: string, opts?: { email?: string | null; name?: string | null }) {
  const cid = normalizeCustomerId(customerId)
  let acc = await prisma.loyaltyAccount.findUnique({ where: { shopifyCustomerId: cid } })
  if (!acc) {
    const s = await getLoyaltySettings()
    acc = await prisma.loyaltyAccount.create({
      data: {
        shopifyCustomerId: cid, email: opts?.email ?? null, customerName: opts?.name ?? null,
        balance: s.signupBonus, totalEarned: s.signupBonus, tier: tierOf(s.signupBonus, s),
      },
    })
    if (s.signupBonus > 0) {
      await prisma.loyaltyTransaction.create({ data: { accountId: acc.id, type: 'SIGNUP', points: s.signupBonus, reason: 'Kayıt bonusu' } })
    }
  } else if ((opts?.email && !acc.email) || (opts?.name && !acc.customerName)) {
    acc = await prisma.loyaltyAccount.update({
      where: { id: acc.id },
      data: { email: acc.email ?? opts?.email ?? null, customerName: acc.customerName ?? opts?.name ?? null },
    })
  }
  return acc
}

/** Sipariş ödenince puan kazandır (mükerrer korumalı). */
export async function awardPoints(customerId: string, opts: { orderTotal: number; orderId?: string; orderName?: string; email?: string | null; name?: string | null }) {
  const s = await getLoyaltySettings()
  if (!s.enabled) return null
  const points = Math.floor(opts.orderTotal * s.pointsPerCurrency)
  if (points <= 0) return null
  const acc = await getOrCreateAccount(customerId, { email: opts.email, name: opts.name })
  if (opts.orderId) {
    const dup = await prisma.loyaltyTransaction.findFirst({ where: { accountId: acc.id, type: 'EARN', orderId: opts.orderId } })
    if (dup) return acc
  }
  const totalEarned = acc.totalEarned + points
  const updated = await prisma.loyaltyAccount.update({
    where: { id: acc.id },
    data: { balance: acc.balance + points, totalEarned, tier: tierOf(totalEarned, s) },
  })
  await prisma.loyaltyTransaction.create({ data: { accountId: acc.id, type: 'EARN', points, reason: 'Sipariş puanı', orderId: opts.orderId, orderName: opts.orderName } })
  return updated
}

/** Manuel puan ekle/çıkar. */
export async function adjustPoints(accountId: number, points: number, reason: string) {
  const acc = await prisma.loyaltyAccount.findUnique({ where: { id: accountId } })
  if (!acc) throw new Error('Hesap bulunamadı')
  const newBalance = acc.balance + points
  if (newBalance < 0) throw new Error('Bakiye negatif olamaz')
  const s = await getLoyaltySettings()
  const totalEarned = points > 0 ? acc.totalEarned + points : acc.totalEarned
  const updated = await prisma.loyaltyAccount.update({
    where: { id: accountId }, data: { balance: newBalance, totalEarned, tier: tierOf(totalEarned, s) },
  })
  await prisma.loyaltyTransaction.create({ data: { accountId, type: 'ADJUST', points, reason: reason || 'Manuel düzeltme' } })
  return updated
}

/** Puanı indirim kuponuna çevir. */
export async function redeemPoints(accountId: number, points: number) {
  const s = await getLoyaltySettings()
  const acc = await prisma.loyaltyAccount.findUnique({ where: { id: accountId } })
  if (!acc) throw new Error('Hesap bulunamadı')
  if (points < s.minRedeem) throw new Error(`En az ${s.minRedeem} puan kullanılabilir`)
  if (points > acc.balance) throw new Error('Yetersiz puan')
  const amount = Math.round(points * s.redeemValue * 100) / 100
  const code = `PUAN${acc.id}${Date.now().toString().slice(-5)}`
  const r = await createDiscountBasic({ code, title: `Sadakat puanı (${points} puan)`, fixedAmount: amount, usageLimit: 1, appliesOncePerCustomer: true })
  if (!r.success) throw new Error('Kupon oluşturulamadı: ' + (r.errors?.[0]?.message || 'Shopify hatası'))
  const updated = await prisma.loyaltyAccount.update({
    where: { id: accountId }, data: { balance: acc.balance - points, totalRedeemed: acc.totalRedeemed + points },
  })
  await prisma.loyaltyTransaction.create({ data: { accountId, type: 'REDEEM', points: -points, reason: `${amount}₺ indirim kuponu`, code } })
  return { account: updated, code, amount }
}

export const TIER_META: Record<string, { label: string; color: string; emoji: string }> = {
  BRONZE: { label: 'Bronz', color: '#B45309', emoji: '🥉' },
  SILVER: { label: 'Gümüş', color: '#6B7280', emoji: '🥈' },
  GOLD: { label: 'Altın', color: '#D97706', emoji: '🥇' },
}
