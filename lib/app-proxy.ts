/**
 * Shopify App Proxy doğrulama.
 *
 * Shopify, magaza.com/apps/customerdashboard/* URL'lerini bizim server'a yönlendirirken
 * URL'e imzalı bir `signature` query parametresi ekler. Doğrulama:
 *   1) Tüm query parametrelerini (signature hariç) alfabetik sırala
 *   2) "key=value" formatında birleştir (URL encode YOK, & ile değil sadece bitişik)
 *   3) HMAC-SHA256(message, proxySecret) hex string → signature ile karşılaştır
 *
 * Dev modunda (NODE_ENV !== 'production') signature yoksa serbest geçer.
 * Production'da signature zorunludur ve geçersizse 401.
 */
import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getStoreConfig } from './customer-dashboard'

export interface ProxyContext {
  storeId: number
  shop: string | null
  loggedInCustomerId: string | null
  signatureValid: boolean
  raw: Record<string, string>
}

/** Query'den proxy parametrelerini doğrular; geçersizse NextResponse döner, geçerliyse ProxyContext. */
export async function verifyAppProxy(req: NextRequest, storeId: number): Promise<ProxyContext | NextResponse> {
  const sp = req.nextUrl.searchParams
  const params: Record<string, string> = {}
  sp.forEach((v, k) => { if (k !== 'signature') params[k] = v })
  const signature = sp.get('signature') || ''

  // Dev modunda imzasız geçişe izin (lokal/tünel testi için)
  const isProd = process.env.NODE_ENV === 'production'
  let signatureValid = false

  const cfg = await getStoreConfig(storeId)
  const secret = cfg.proxySecret || ''

  if (signature && secret) {
    const message = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('')
    const digest = crypto.createHmac('sha256', secret).update(message).digest('hex')
    // Timing-safe karşılaştırma
    try {
      signatureValid = digest.length === signature.length &&
        crypto.timingSafeEqual(Buffer.from(digest, 'hex'), Buffer.from(signature, 'hex'))
    } catch { signatureValid = false }
  }

  // Secret tanımlıysa doğrulama zorunlu, değilse (henüz girilmemişse) izin ver (setup modu).
  if (isProd && secret && !signatureValid) {
    return NextResponse.json({ success: false, message: 'Invalid App Proxy signature' }, { status: 401 })
  }
  if (isProd && !secret) {
    console.warn(`[app-proxy] store ${storeId}: proxySecret tanımlı değil — signature kontrolü atlandı.`)
  }

  return {
    storeId,
    shop: params.shop || null,
    loggedInCustomerId: params.logged_in_customer_id || null,
    signatureValid,
    raw: params,
  }
}
