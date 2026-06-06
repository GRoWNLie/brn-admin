import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAppProxy } from '@/lib/app-proxy'

export const dynamic = 'force-dynamic'

/**
 * Shopify App Proxy router.
 * Shopify, magaza.com/apps/customerdashboard/* URL'lerini buraya yönlendirir
 * (Partner App → App Proxy → Proxy URL: https://senin-domain.com/apps/customerdashboard/login).
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

  // Internal fetch hedef URL'i:
  //   - NEXTAUTH_URL (production: https://admin.sekerco.com)
  //   - VERCEL_URL (Vercel serverless fallback)
  //   - 127.0.0.1:PORT (lokal/Railway fallback — DNS gerekmez)
  const appBase =
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    `http://127.0.0.1:${process.env.PORT || '3000'}`

  // Tarayıcıya enjekte edilen <base>, fetch interceptor ve click handler için
  // public admin URL'i lazım (127.0.0.1 değil).
  const publicBase = process.env.NEXTAUTH_URL || appBase

  const target = new URL(`/storefront/${store.id}/${sub}`, appBase)

  try {
    console.log('🔥 INTERNAL FETCH:', target.toString())
    const internalRes = await fetch(target.toString(), {
      headers: { 'x-app-proxy': '1', 'user-agent': req.headers.get('user-agent') || 'shopify-app-proxy' },
      cache: 'no-store',
    })
    let html = await internalRes.text()

    // Storefront sayfası mağaza domain'inde render edildiği için (sekerco.com),
    // /_next/static, /api/..., href="/storefront/..." gibi yollar mağazaya gider → 404.
    // Çözüm: <base> + fetch interceptor + link rewrite ile hepsini admin'e yönlendir.
    const injected = `
      <base href="${publicBase}/">
      <script>
        window.__SF_API_BASE = '${publicBase}';
        (function(){
          var f = window.fetch;
          window.fetch = function(input, init){
            if (typeof input === 'string' && input.charAt(0) === '/') {
              input = window.__SF_API_BASE + input;
            }
            return f.call(this, input, init);
          };
          // Storefront link'lerini App Proxy URL'inde tut (mağaza domain'inde kalsın).
          document.addEventListener('click', function(e){
            var a = e.target.closest && e.target.closest('a');
            if (!a) return;
            var href = a.getAttribute('href') || '';
            var m = href.match(/^\\/storefront\\/\\d+\\/(.*)$/);
            if (m) { e.preventDefault(); window.location.href = '/apps/customerdashboard/' + m[1]; }
          }, true);
        })();
      </script>
    `
    html = html.replace(/<head[^>]*>/i, (m) => m + injected)

    return new NextResponse(html, {
      status: internalRes.status,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    })
  } catch (e: any) {
    console.error('💥 FETCH PATLADI! HEDEF URL:', target.toString())
    console.error('💥 TAM HATA DETAYI:', e)
    return new NextResponse(
      `<!doctype html><html><body><p>Storefront yüklenemedi: ${e?.message || 'Bilinmeyen hata'}</p><p>Hedef: ${target.toString()}</p></body></html>`,
      { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    )
  }
}

export async function GET(req: NextRequest, { params }: { params: { path?: string[] } }) {
  return handle(req, params.path ?? [])
}

export async function POST(req: NextRequest, { params }: { params: { path?: string[] } }) {
  return handle(req, params.path ?? [])
}
