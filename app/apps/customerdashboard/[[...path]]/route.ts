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
 *   1) Query'den ?shop=magaza.myshopify.com → store'u DB'de bul
 *      (yoksa custom_domain veya host header'la dene)
 *   2) verifyAppProxy ile signature'ı doğrula (production'da zorunlu)
 *   3) Doğru /storefront/[storeId]/<path> sayfasına rewrite et (URL'de storeId GÖRÜNMEZ)
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

  // 3) Storefront sayfasına rewrite
  const sub = pathSeg.length ? pathSeg.join('/') : 'login'
  const target = req.nextUrl.clone()
  target.pathname = `/storefront/${store.id}/${sub}`
  // App Proxy parametrelerini koru (logged_in_customer_id vs.)
  return NextResponse.rewrite(target)
}

export async function GET(req: NextRequest, { params }: { params: { path?: string[] } }) {
  return handle(req, params.path ?? [])
}
export async function POST(req: NextRequest, { params }: { params: { path?: string[] } }) {
  return handle(req, params.path ?? [])
}
