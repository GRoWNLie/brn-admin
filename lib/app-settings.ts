/**
 * Genel uygulama ayar deposu (API anahtarları vb.).
 * Öncelik: DB (panelden değiştirilebilir) → yoksa process.env (.env fallback).
 * Kısa süreli in-memory cache ile DB yükü azaltılır; kaydedince cache temizlenir.
 */
import { prisma } from './prisma'

let cache: Record<string, string> | null = null
let cacheAt = 0
const TTL_MS = 10_000

async function loadAll(): Promise<Record<string, string>> {
  if (cache && Date.now() - cacheAt < TTL_MS) return cache
  const rows = await prisma.appSetting.findMany()
  const map: Record<string, string> = {}
  for (const r of rows) if (r.value != null && r.value !== '') map[r.key] = r.value
  cache = map
  cacheAt = Date.now()
  return map
}

/** DB değeri varsa onu, yoksa process.env[key], o da yoksa '' döner. */
export async function getSetting(key: string): Promise<string> {
  try {
    const all = await loadAll()
    if (all[key]) return all[key]
  } catch {
    // DB erişilemezse env'e düş
  }
  return process.env[key] ?? ''
}

/** Birden çok anahtarı tek seferde getirir. */
export async function getSettings(keys: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  for (const k of keys) out[k] = await getSetting(k)
  return out
}

/** Bir ayarın kaynağını ve set olup olmadığını döner (UI için). */
export async function getSettingStatus(key: string): Promise<{ source: 'db' | 'env' | 'none'; isSet: boolean }> {
  try {
    const all = await loadAll()
    if (all[key]) return { source: 'db', isSet: true }
  } catch {}
  if (process.env[key]) return { source: 'env', isSet: true }
  return { source: 'none', isSet: false }
}

export async function setSetting(key: string, value: string): Promise<void> {
  if (value === '') {
    await prisma.appSetting.deleteMany({ where: { key } })
  } else {
    await prisma.appSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    })
  }
  invalidateSettingsCache()
}

export function invalidateSettingsCache(): void {
  cache = null
  cacheAt = 0
}
