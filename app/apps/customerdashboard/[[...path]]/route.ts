import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAppProxy } from '@/lib/app-proxy'

export const dynamic = 'force-dynamic'

/**
 * Shopify App Proxy router.
 * Shopify, magaza.com/apps/customerdashboard/* URL'lerini buraya yönlendirir
 * (Partner App → App Proxy → Proxy URL: https://senin-domain.com/apps/customerdashboard/login).
 *
 * Akış:
 * 1) Query'den ?shop=magaza.myshopify.com → store'u DB'de bul
 * (yoksa custom_domain veya host header'la dene)
 * 2) verifyAppProxy ile signature'ı doğrula (production'da zorunlu)
 * 3) Doğru /storefront/[storeId]/<path> sayfasına rewrite et (URL'de storeId GÖRÜNMEZ)
 */

async function handle(req: NextRequest, pathSeg: string[]) {
  const sp = req.nextUrl.searchParams
  const shop = sp.get('shop') || ''
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || ''

  // 1) Store'u bul
  const store = await prisma.store.findFirst({
    where: {
      OR: [
        ...(shop ? [{ shopifyDomain: shop }] : []),
        ...(host ? [{ customDomain: host }, { shopifyDomain: host }] : []),
      ],
    },
    select: { id: true, status: true },
  })

  if (!store) {
    return NextResponse.json({ success: false, message: 'Mağaza tanımlı değil. BRN Admin → Customer Dashboard → Mağazalar üzerinden ekleyin.' }, { status: 404 })
  }

  if (store.status === 'paused') {
    return NextResponse.json({ success: false, message: 'Mağaza şu an erişilebilir değil.' }, { status: 403 })
  }

  // 2) App Proxy signature doğrula
  const ctx = await verifyAppProxy(req, store.id)
  if (ctx instanceof NextResponse) return ctx

  // 3) Storefront sayfasını internal fetch ile çek, HTML'i Shopify'a dön
  const sub = pathSeg.length ? pathSeg.join('/') : 'login'
  
  // Mevcut URL'i klonluyoruz ki Shopify'ın ?shop=... gibi kritik parametreleri kaybolmasın
  const target = new URL(req.url)
  
  // İç ağda (Railway container) olduğumuz için SSL (https) aramadan, doğrudan yerel porta bağlanıyoruz!
  // Node 18+ sürümlerinde IPv6 çakışmasını önlemek için localhost yerine 127.0.0.1 kullanıyoruz.
  target.protocol = 'http:'
  target.hostname = '127.0.0.1'
  target.port = process.env.PORT || '3000'
  target.pathname = `/storefront/${store.id}/${sub}`

  try {
    console.log("🔥 INTERNAL FETCH DENENIYOR:", target.toString()) 
    
    const internalRes = await fetch(target.toString(), {
      headers: { 'x-app-proxy': '1', 'user-agent': req.headers.get('user-agent') || 'shopify-app-proxy' },
      cache: 'no-store',
    })
    
    const html = await internalRes.text()
    
    return new NextResponse(html, {
      status: internalRes.status,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    })
  } catch (e: any) {
    console.error("💥 FETCH PATLADI! HEDEF URL:", target.toString());
    console.error("💥 TAM HATA DETAYI:", e);
    
    return new NextResponse(`<!doctype html><html><body><p>Storefront yüklenemedi: ${e?.message || 'Bilinmeyen bir hata'}</p></body></html>`, {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }
}

export async function GET(req: NextRequest, { params }: { params: { path?: string[] } }) {
  return handle(req, params.path ?? [])
}

export async function POST(req: NextRequest, { params }: { params: { path?: string[] } }) {
  return handle(req, params.path ?? [])
}
