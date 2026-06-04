/**
 * Storefront müşteri oturum yönetimi (cookie tabanlı).
 * Lokal kayıt + Shopify Customer Account API'ye köprü.
 */
import crypto from 'crypto'
import { cookies } from 'next/headers'
import { prisma } from './prisma'
import { encrypt, decrypt } from './efatura/crypto'

const COOKIE_NAME = 'sf_sid'
const ONE_WEEK = 7 * 24 * 60 * 60

export function cookieName(storeId: number) { return `${COOKIE_NAME}_${storeId}` }

export async function getSession(storeId: number) {
  const sid = cookies().get(cookieName(storeId))?.value
  if (!sid) return null
  const s = await prisma.storefrontSession.findUnique({ where: { id: sid } })
  if (!s || s.storeId !== storeId) return null
  return s
}

export async function createSession(storeId: number, customerId: string, tokens?: { accessToken?: string; refreshToken?: string; expiresAt?: Date }) {
  const sid = crypto.randomBytes(24).toString('hex')
  await prisma.storefrontSession.create({
    data: {
      id: sid, storeId, customerId,
      accessToken: tokens?.accessToken ? encrypt(tokens.accessToken) : null,
      refreshToken: tokens?.refreshToken ? encrypt(tokens.refreshToken) : null,
      expiresAt: tokens?.expiresAt ?? null,
    },
  })
  cookies().set({
    name: cookieName(storeId), value: sid,
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
    path: '/', maxAge: ONE_WEEK,
  })
  return sid
}

export async function destroySession(storeId: number) {
  const sid = cookies().get(cookieName(storeId))?.value
  if (sid) await prisma.storefrontSession.deleteMany({ where: { id: sid } }).catch(() => {})
  cookies().delete(cookieName(storeId))
}

export function decryptToken(value: string | null): string | null {
  if (!value) return null
  const v = decrypt(value)
  return v || null
}

/** Recently viewed: en yeni başa, max 30, deduplicated. */
export async function addRecentlyViewed(storeId: number, productGid: string) {
  const s = await getSession(storeId)
  if (!s) return
  let list: string[] = []
  try { list = JSON.parse(s.recentViewed || '[]') } catch {}
  list = [productGid, ...list.filter(x => x !== productGid)].slice(0, 30)
  await prisma.storefrontSession.update({ where: { id: s.id }, data: { recentViewed: JSON.stringify(list) } })
}
