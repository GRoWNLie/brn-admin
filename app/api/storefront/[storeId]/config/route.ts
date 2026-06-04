import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAppProxy } from '@/lib/app-proxy'

// GET /api/storefront/[storeId]/config — storefront için public tema + içerik + sayfa map
// App Proxy çağrılarında signature ile doğrulanır; dev'de bypass.
export async function GET(req: NextRequest, { params }: { params: { storeId: string } }) {
  const storeId = Number(params.storeId)
  if (!storeId) return NextResponse.json({ success: false, message: 'Geçersiz storeId' }, { status: 400 })

  const ctx = await verifyAppProxy(req, storeId)
  if (ctx instanceof NextResponse) return ctx

  const store = await prisma.store.findUnique({
    where: { id: storeId },
    include: { theme: true, content: true, pages: { orderBy: { pageKey: 'asc' } } },
  })
  if (!store || store.status === 'paused') {
    return NextResponse.json({ success: false, message: 'Mağaza erişilebilir değil' }, { status: 404 })
  }

  let visibleTabs: any = { profile: true, orders: true, addresses: true, recent: true, top: true }
  try { if (store.content?.visibleTabs) visibleTabs = { ...visibleTabs, ...JSON.parse(store.content.visibleTabs) } } catch {}

  return NextResponse.json({
    success: true,
    signatureValid: ctx.signatureValid,
    store: { id: store.id, slug: store.slug, name: store.name, shopifyDomain: store.shopifyDomain, status: store.status },
    theme: store.theme,
    content: store.content ? {
      topBannerText: store.content.topBannerText,
      welcomeTemplate: store.content.welcomeTemplate,
      kvkkText: store.content.kvkkText,
      termsText: store.content.termsText,
      visibleTabs,
    } : null,
    pages: store.pages.map(p => ({ pageKey: p.pageKey, enabled: p.enabled, title: p.title, description: p.description })),
    customer: ctx.loggedInCustomerId ? { id: ctx.loggedInCustomerId } : null,
  })
}
