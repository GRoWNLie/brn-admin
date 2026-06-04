import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import StorefrontShell from './StorefrontShell'

export const dynamic = 'force-dynamic'

/**
 * Storefront sunucu-tarafı layout.
 * Mağaza temasını + içeriğini DB'den çekip CSS değişkenlerine enjekte eder.
 * App Proxy doğrulaması storefront sayfalarına özgü değil — config endpoint yapacak;
 * burada sadece görsel/içerik beslenir.
 */
export default async function StorefrontLayout({
  children, params,
}: { children: React.ReactNode; params: { storeId: string } }) {
  const storeId = Number(params.storeId)
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    include: { theme: true, content: true, pages: { orderBy: { pageKey: 'asc' } } },
  })

  if (!store) {
    return <div style={{ padding: 40, fontFamily: 'system-ui' }}>Mağaza bulunamadı.</div>
  }
  if (store.status === 'paused') {
    return <div style={{ padding: 40, fontFamily: 'system-ui' }}>Mağaza şu an erişilebilir değil.</div>
  }

  let visibleTabs: any = { profile: true, orders: true, addresses: true, recent: true, top: true }
  try { if (store.content?.visibleTabs) visibleTabs = { ...visibleTabs, ...JSON.parse(store.content.visibleTabs) } } catch {}

  const config = {
    storeId: store.id, slug: store.slug, name: store.name,
    theme: store.theme,
    content: store.content ? {
      topBannerText: store.content.topBannerText,
      welcomeTemplate: store.content.welcomeTemplate,
      kvkkText: store.content.kvkkText,
      termsText: store.content.termsText,
      visibleTabs,
    } : null,
    pages: store.pages.map(p => ({ pageKey: p.pageKey, enabled: p.enabled, title: p.title })),
  }

  // Forwarded host (App Proxy üzerinden bilinmesi için, izleme amaçlı)
  const h = headers()
  const forwardedHost = h.get('x-forwarded-host') || h.get('host') || ''

  return (
    <StorefrontShell config={config} forwardedHost={forwardedHost}>
      {children}
    </StorefrontShell>
  )
}
