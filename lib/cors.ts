/**
 * CORS yardımcıları — Public widget endpoint'leri için.
 * Shopify mağazasından gelen istekler için CORS başlıkları.
 */
import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_ORIGINS_RAW = process.env.WIDGET_ALLOWED_ORIGINS || '*'
const ALLOWED_ORIGINS = ALLOWED_ORIGINS_RAW.split(',').map(s => s.trim())

export function corsHeaders(req: NextRequest): Headers {
  const origin = req.headers.get('origin') || ''
  const headers = new Headers()

  // '*' veya whitelist'te varsa allow et
  if (ALLOWED_ORIGINS.includes('*')) {
    headers.set('Access-Control-Allow-Origin', '*')
  } else if (ALLOWED_ORIGINS.some(o => origin.includes(o))) {
    headers.set('Access-Control-Allow-Origin', origin)
    headers.set('Vary', 'Origin')
  }

  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  headers.set('Access-Control-Max-Age', '86400')
  return headers
}

export function corsJson(req: NextRequest, body: any, init?: { status?: number }): NextResponse {
  const headers = corsHeaders(req)
  headers.set('Content-Type', 'application/json')
  return new NextResponse(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers,
  })
}

export function corsPreflight(req: NextRequest): NextResponse {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) })
}
