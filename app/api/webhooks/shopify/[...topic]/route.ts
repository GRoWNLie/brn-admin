import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookHmac, processWebhook } from '@/lib/shopify-webhooks'

/**
 * Universal Shopify webhook endpoint.
 * URL: /api/webhooks/shopify/orders/create
 *      /api/webhooks/shopify/products/update
 *      vs.
 *
 * HMAC validate edilir, payload Prisma'ya loglanır, topic-bazlı işlenir.
 * Shopify 200 dışı yanıt görürse exponential backoff ile retry yapar.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { topic: string[] } }
) {
  const topic = params.topic.join('/')  // ["orders", "create"] → "orders/create"
  const shopDomain = req.headers.get('x-shopify-shop-domain') || 'unknown'
  const hmacHeader = req.headers.get('x-shopify-hmac-sha256')

  // Raw body okumak ŞART (HMAC için), sonra JSON parse
  const rawBody = await req.text()
  const hmacValid = verifyWebhookHmac(rawBody, hmacHeader)

  if (!hmacValid && process.env.NODE_ENV === 'production') {
    // Production'da HMAC fail = 401
    return new NextResponse('Invalid HMAC', { status: 401 })
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return new NextResponse('Invalid JSON', { status: 400 })
  }

  const result = await processWebhook(topic, shopDomain, payload, hmacValid)

  // Shopify retry yapmasın diye her zaman 200 dönüyoruz (hata DB'de loglanıyor)
  return NextResponse.json({ ok: result.success, error: result.error })
}

// GET ile health check
export async function GET(_req: NextRequest, { params }: { params: { topic: string[] } }) {
  return NextResponse.json({
    ok: true,
    message: `Shopify webhook endpoint aktif: ${params.topic.join('/')}`,
    hint: 'Shopify POST göndermelidir. Manuel test için POST yapın.',
  })
}
