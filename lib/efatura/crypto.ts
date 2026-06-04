/**
 * Servis sağlayıcı credential'larını şifrelemek için AES-256-GCM.
 * Anahtar: ENCRYPTION_KEY (yoksa NEXTAUTH_SECRET'tan türetilir).
 */
import crypto from 'crypto'

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || 'brn-admin-dev-key-change-me'
  return crypto.createHash('sha256').update(raw).digest() // 32 byte
}

export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, enc]).toString('base64')
}

export function decrypt(payload: string): string {
  try {
    const buf = Buffer.from(payload, 'base64')
    const iv = buf.subarray(0, 12)
    const tag = buf.subarray(12, 28)
    const enc = buf.subarray(28)
    const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8')
  } catch {
    return ''
  }
}

export function encryptJson(obj: unknown): string {
  return encrypt(JSON.stringify(obj ?? {}))
}

export function decryptJson<T = Record<string, unknown>>(payload: string | null): T | null {
  if (!payload) return null
  const plain = decrypt(payload)
  if (!plain) return null
  try { return JSON.parse(plain) as T } catch { return null }
}
