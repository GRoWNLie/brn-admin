/**
 * Shopify OAuth Callback
 *
 * Mağaza sahibi /api/shopify/install üzerinden onayladıktan sonra Shopify buraya yönlendirir:
 *   ?code=...&shop=...&hmac=...&state=...&timestamp=...
 *
 * Yapılan işlemler:
 *   1) HMAC doğrula (SHOPIFY_API_SECRET ile)
 *   2) state cookie ile karşılaştır (CSRF)
 *   3) code → access_token değişimi (POST https://{shop}/admin/oauth/access_token)
 *   4) shpat_ formatındaki token + shop URL'i DB'ye kaydet (AppSetting)
 *   5) shopify-auth cache'ini invalidate et
 *   6) /dashboard'a yönlendir
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSetting, setSetting } from '@/lib/app-settings'
import { invalidateToken } from '@/lib/shopify-auth'

export const dynamic = 'force-dynamic'

function htmlError(title: string, detail: string, status = 400) {
  return new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
    <style>body{font:14px ui-sans-serif,system-ui;padding:40px;max-width:800px;margin:auto;color:#111}
    .box{background:#fef2f2;border-left:4px solid #DC2626;padding:20px;border-radius:8px}
    pre{background:rgba(0,0,0,.04);padding:12px;border-radius:6px;white-space:pre-wrap;word-break:break-word;font-size:12px}
    h1{color:#DC2626;margin:0 0 8px;font-size:18px}</style></head>
    <body><div class="box"><h1>⚠️ ${title}</h1><pre>${detail.replace(/</g, '&lt;')}</pre>
    <p><a href="/api/shopify/install">→ Yeniden dene</a></p></div></body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  )
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const code = sp.get('code')
  const shop = sp.get('shop')
  const state = sp.get('state')
  const hmac = sp.get('hmac')

  if (!code || !shop || !state || !hmac) {
    return htmlError(
      'Eksik parametre',
      `Shopify yanıtı eksik. Beklenen: code, shop, state, hmac.\n\nGelen:\ncode  = ${code}\nshop  = ${shop}\nstate = ${state}\nhmac  = ${hmac}`
    )
  }

  // 1) state cookie ile karşılaştır (CSRF koruması)
  const cookieState = req.cookies.get('shopify_oauth_state')?.value
  if (!cookieState || cookieState !== state) {
    return htmlError(
      'CSRF doğrulama başarısız',
      `state cookie eşleşmedi.\ncookie: ${cookieState || '(yok)'}\nurl   : ${state}\n\n/api/shopify/install üzerinden yeniden başlat.`
    )
  }

  // 2) HMAC doğrula
  const apiSecret = await getSetting('SHOPIFY_API_SECRET')
  if (!apiSecret) {
    return htmlError(
      'SHOPIFY_API_SECRET eksik',
      'Public App\'in Client Secret/API Secret değerini Railway → Variables → SHOPIFY_API_SECRET olarak ekle.',
      500
    )
  }

  // HMAC hesaplaması: query string'ten hmac parametresi çıkarılır, geri kalanlar
  // alfabetik sıralanır ve API_SECRET ile HMAC-SHA256 hesaplanır.
  const params: Array<[string, string]> = []
  sp.forEach((v, k) => { if (k !== 'hmac' && k !== 'signature') params.push([k, v]) })
  params.sort(([a], [b]) => a.localeCompare(b))
  const message = params.map(([k, v]) => `${k}=${v}`).join('&')
  const computed = crypto.createHmac('sha256', apiSecret).update(message).digest('hex')

  const a = Buffer.from(computed, 'hex')
  const b = Buffer.from(hmac, 'hex')
  const hmacOk = a.length === b.length && crypto.timingSafeEqual(a, b)

  if (!hmacOk) {
    return htmlError(
      'HMAC doğrulama başarısız',
      `Bu istek Shopify'dan gelmemiş olabilir veya SHOPIFY_API_SECRET yanlış.\n\nGelen hmac : ${hmac}\nHesaplanan : ${computed}\nMesaj      : ${message}`,
      401
    )
  }

  // 3) shop format kontrol (xyz.myshopify.com)
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(shop)) {
    return htmlError(
      'Geçersiz shop',
      `shop parametresi myshopify.com domaini olmalı.\nGelen: ${shop}`
    )
  }

  // 4) code → access_token
  const apiKey = await getSetting('SHOPIFY_API_KEY')
  const tokenUrl = `https://${shop}/admin/oauth/access_token`
  let tokenRes: Response
  try {
    tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ client_id: apiKey, client_secret: apiSecret, code }),
      cache: 'no-store',
    })
  } catch (e) {
    return htmlError(
      'Token isteği başarısız (network)',
      `fetch hatası: ${e instanceof Error ? e.message : String(e)}\nURL: ${tokenUrl}`,
      502
    )
  }

  if (!tokenRes.ok) {
    const body = await tokenRes.text().catch(() => '')
    return htmlError(
      `Token alınamadı (HTTP ${tokenRes.status})`,
      `URL: ${tokenUrl}\n\nShopify yanıtı:\n${body.slice(0, 800)}\n\nKontrol et:\n- SHOPIFY_API_KEY (Public App Client ID) doğru mu?\n- SHOPIFY_API_SECRET (Public App Client Secret) doğru mu?\n- code expire olmuş olabilir (10 dk) — yeniden install et.`,
      tokenRes.status
    )
  }

  const tokenData = (await tokenRes.json().catch(() => ({}))) as {
    access_token?: string
    scope?: string
  }

  if (!tokenData.access_token) {
    return htmlError(
      'access_token alanı yok',
      `Yanıt: ${JSON.stringify(tokenData).slice(0, 500)}`,
      502
    )
  }

  // 5) DB'ye kaydet — bu shpat_ formatında permanent offline token
  await setSetting('SHOPIFY_ADMIN_ACCESS_TOKEN', tokenData.access_token)
  await setSetting('SHOPIFY_STORE_URL', shop)

  // 6) Token cache'i invalidate et
  invalidateToken()

  // 7) Başarı sayfası
  const tokenPreview = `${tokenData.access_token.slice(0, 12)}…${tokenData.access_token.slice(-4)}`
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Bağlandı ✅</title>
  <style>body{font:14px ui-sans-serif,system-ui;padding:40px;max-width:800px;margin:auto;color:#111}
  .box{background:#f0fdf4;border-left:4px solid #16a34a;padding:20px;border-radius:8px}
  h1{color:#16a34a;margin:0 0 12px;font-size:20px}
  table{border-collapse:collapse;margin-top:10px;width:100%}
  td{padding:6px 10px;font-size:13px;border-bottom:1px solid #e5e7eb}
  td:first-child{font-weight:600;width:160px;color:#374151}
  .btn{display:inline-block;margin-top:16px;background:#111;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600}</style>
  </head><body><div class="box">
  <h1>✅ Shopify bağlantısı kuruldu</h1>
  <p>Public App mağazaya başarıyla install edildi. Admin Token kaydedildi.</p>
  <table>
    <tr><td>Mağaza</td><td><code>${shop}</code></td></tr>
    <tr><td>Token (önek)</td><td><code>${tokenPreview}</code></td></tr>
    <tr><td>Scope</td><td><code>${(tokenData.scope || '').slice(0, 300)}</code></td></tr>
  </table>
  <a class="btn" href="/dashboard">→ Dashboard'a git</a>
  </div></body></html>`

  const res = new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
  // CSRF cookie'lerini temizle
  res.cookies.set('shopify_oauth_state', '', { path: '/', maxAge: 0 })
  res.cookies.set('shopify_oauth_shop', '', { path: '/', maxAge: 0 })

  return res
}
