/**
 * Basit in-memory rate limit (IP + key başına dakikada N istek).
 * Vercel hot instance içinde paylaşılır; multi-region için ileride KV/Redis'e geçer.
 */
const buckets = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(key: string, max = 30, windowMs = 60_000): { ok: boolean; remaining: number; resetIn: number } {
  const now = Date.now()
  const b = buckets.get(key)
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, remaining: max - 1, resetIn: windowMs }
  }
  if (b.count >= max) return { ok: false, remaining: 0, resetIn: b.resetAt - now }
  b.count += 1
  return { ok: true, remaining: max - b.count, resetIn: b.resetAt - now }
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return req.headers.get('x-real-ip') || 'unknown'
}
