import { Suspense } from 'react'
import { getProducts, formatCurrency } from '@/lib/shopify-data'
import ProductsClient from './ProductsClient'

export const dynamic = 'force-dynamic'

async function ProductsData({
  search, after, first,
}: {
  search?: string
  after?: string
  first: number
}) {
  try {
    const result = await getProducts({ first, after: after || null, search })
    return <ProductsClient data={result} search={search ?? ''} first={first} />
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Bilinmeyen hata'
    return (
      <div className="panel-card" style={{ borderLeft: '4px solid #DC2626' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#DC2626', marginBottom: 6 }}>
          ⚠️ Ürünler yüklenemedi
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{msg}</div>
      </div>
    )
  }
}

export default function ProductsPage({
  searchParams,
}: {
  searchParams: { search?: string; after?: string; first?: string }
}) {
  const first = Math.min(parseInt(searchParams.first || '25', 10) || 25, 100)
  return (
    <div className="page-content">
      <div className="product-header">
        <h1 className="page-title">Ürünler</h1>
        <div className="product-actions-right">
          <a href="/products/new" className="btn-primary" style={{ textDecoration: 'none' }}>➕ Ürün Ekle</a>
        </div>
      </div>

      <Suspense fallback={
        <div className="panel-card">
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            ⏳ Shopify ürünleri yükleniyor...
          </div>
        </div>
      }>
        <ProductsData
          search={searchParams.search}
          after={searchParams.after}
          first={first}
        />
      </Suspense>
    </div>
  )
}
