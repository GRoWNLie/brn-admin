import { getProductDetail } from '@/lib/shopify-mutations'
import ProductEditClient from './ProductEditClient'

export const dynamic = 'force-dynamic'

export default async function ProductEditPage({ params }: { params: { id: string } }) {
  // URL'den gelen `id` zaten encoded — örn "gid%3A%2F%2Fshopify%2FProduct%2F123"
  const productId = decodeURIComponent(params.id)

  let product = null
  let error: string | null = null
  try {
    product = await getProductDetail(productId)
    if (!product) error = 'Ürün bulunamadı'
  } catch (e) {
    error = e instanceof Error ? e.message : 'Bilinmeyen hata'
  }

  if (error || !product) {
    return (
      <div className="page-content">
        <div className="product-header">
          <h1 className="page-title">Ürün Düzenle</h1>
        </div>
        <div className="panel-card" style={{ borderLeft: '4px solid #DC2626' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#DC2626', marginBottom: 6 }}>
            ⚠️ Ürün yüklenemedi
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{error}</div>
        </div>
      </div>
    )
  }

  return <ProductEditClient product={product} />
}
