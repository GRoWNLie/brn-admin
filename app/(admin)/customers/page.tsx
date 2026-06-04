import { Suspense } from 'react'
import { getCustomers } from '@/lib/shopify-data'
import CustomersClient from './CustomersClient'
import ShopifyAccessDeniedHelp from '@/components/ShopifyAccessDeniedHelp'

export const dynamic = 'force-dynamic'

async function CustomersData({
  search, after, first,
}: {
  search?: string
  after?: string
  first: number
}) {
  try {
    const result = await getCustomers({ first, after: after || null, search })
    return <CustomersClient data={result} search={search ?? ''} first={first} />
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Bilinmeyen hata'
    const isAccessDenied = /Access denied|protected customer data|not approved|read_customers/i.test(msg)

    if (isAccessDenied) {
      return <ShopifyAccessDeniedHelp field="customers" rawMessage={msg} />
    }
    return (
      <div className="panel-card" style={{ borderLeft: '4px solid #DC2626' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#DC2626', marginBottom: 6 }}>
          ⚠️ Müşteriler yüklenemedi
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{msg}</div>
      </div>
    )
  }
}

export default function CustomersPage({
  searchParams,
}: {
  searchParams: { search?: string; after?: string; first?: string }
}) {
  const first = Math.min(parseInt(searchParams.first || '25', 10) || 25, 100)
  return (
    <div className="page-content">
      <div className="product-header">
        <h1 className="page-title">Müşteriler</h1>
        <div className="product-actions-right">
          <button className="btn-secondary">Dışa Aktar</button>
          <button className="btn-primary">Müşteri Ekle</button>
        </div>
      </div>

      <Suspense fallback={
        <div className="panel-card">
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            ⏳ Shopify müşterileri yükleniyor...
          </div>
        </div>
      }>
        <CustomersData
          search={searchParams.search}
          after={searchParams.after}
          first={first}
        />
      </Suspense>
    </div>
  )
}
