'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ProductEditDetail } from '@/lib/shopify-mutations'

export default function ProductEditClient({ product }: { product: ProductEditDetail }) {
  const router = useRouter()

  // Ürün ana alanları
  const [title, setTitle] = useState(product.title)
  const [vendor, setVendor] = useState(product.vendor)
  const [productType, setProductType] = useState(product.productType)
  const [status, setStatus] = useState(product.status)
  const [bodyHtml, setBodyHtml] = useState(product.bodyHtml)
  const [tagsInput, setTagsInput] = useState(product.tags.join(', '))

  // Varyantlar
  const [variants, setVariants] = useState(product.variants.map(v => ({
    ...v,
    inventoryQuantity: v.inventoryQuantity ?? 0,
  })))

  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  function updateVariantField(idx: number, key: string, value: any) {
    setVariants(prev => prev.map((v, i) => i === idx ? { ...v, [key]: value } : v))
  }

  async function handleSave() {
    setSaving(true)
    setMessage(null)

    const payload = {
      product: {
        title,
        vendor,
        productType,
        status,
        descriptionHtml: bodyHtml,
        tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
      },
      variants: variants.map(v => ({
        id: v.id,
        price: String(v.price),
        compareAtPrice: v.compareAtPrice ? String(v.compareAtPrice) : null,
        sku: v.sku || '',
        barcode: v.barcode || '',
        inventoryQuantity: typeof v.inventoryQuantity === 'number' ? v.inventoryQuantity : 0,
        inventoryItemId: v.inventoryItemId,
        locationId: v.locationId,
      })),
    }

    try {
      const res = await fetch(`/api/shopify/products/${encodeURIComponent(product.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (data.success) {
        setMessage({
          kind: 'success',
          text: `✅ Shopify'a kaydedildi! Ürün: ${data.productUpdated ? 'OK' : '—'}, Varyant: ${data.variantsUpdated}, Stok: ${data.inventoryUpdated}`,
        })
        // Liste sayfası cache'ini bir sonraki ziyarette yenile
        router.refresh()
      } else {
        setMessage({
          kind: 'error',
          text: '❌ Hata:\n' + (data.errors?.join('\n') || 'Bilinmeyen'),
        })
      }
    } catch (e: any) {
      setMessage({ kind: 'error', text: `❌ İstek hatası: ${e?.message ?? 'bilinmeyen'}` })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-content">
      <div className="product-header">
        <div>
          <button
            onClick={() => router.push('/products')}
            style={{
              background: 'none', border: 'none',
              color: 'var(--text-muted)', cursor: 'pointer',
              fontSize: 12, marginBottom: 4,
            }}
          >← Ürünler</button>
          <h1 className="page-title">Ürün Düzenle</h1>
        </div>
        <div className="product-actions-right">
          <button className="btn-secondary" onClick={() => router.push('/products')}>
            İptal
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? '⏳ Kaydediliyor...' : '💾 Shopify\'a Kaydet'}
          </button>
        </div>
      </div>

      {message && (
        <div className="panel-card" style={{
          borderLeft: `4px solid ${message.kind === 'success' ? '#10B981' : '#DC2626'}`,
          whiteSpace: 'pre-wrap',
        }}>
          <div style={{
            fontSize: 14, fontWeight: 600,
            color: message.kind === 'success' ? '#065F46' : '#991B1B',
          }}>
            {message.text}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        {/* SOL: ÜRÜN BİLGİLERİ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="panel-card">
            <div className="settings-section-title">Ürün Bilgileri</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="form-label">Başlık</label>
                <input
                  className="form-select"
                  style={{ width: '100%' }}
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label">Açıklama (HTML)</label>
                <textarea
                  className="form-select"
                  style={{ width: '100%', minHeight: 120, fontFamily: 'inherit', resize: 'vertical' }}
                  value={bodyHtml}
                  onChange={e => setBodyHtml(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Varyantlar */}
          <div className="panel-card">
            <div className="settings-section-title">Varyantlar &amp; Fiyatlandırma</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {variants.map((v, idx) => (
                <div key={v.id} style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: 10,
                  padding: 16,
                  background: 'var(--hover-bg)',
                }}>
                  <div style={{
                    fontSize: 13, fontWeight: 700,
                    color: 'var(--text-main)', marginBottom: 10,
                  }}>
                    {v.title === 'Default Title' ? 'Varsayılan Varyant' : v.title}
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                    gap: 12,
                  }}>
                    <div>
                      <label className="form-label">Fiyat</label>
                      <input
                        type="number" step="0.01" min="0"
                        className="form-select"
                        style={{ width: '100%' }}
                        value={v.price}
                        onChange={e => updateVariantField(idx, 'price', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label">Karşılaştırma Fiyatı</label>
                      <input
                        type="number" step="0.01" min="0"
                        className="form-select"
                        style={{ width: '100%' }}
                        value={v.compareAtPrice ?? ''}
                        placeholder="—"
                        onChange={e => updateVariantField(idx, 'compareAtPrice', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label">SKU</label>
                      <input
                        className="form-select"
                        style={{ width: '100%' }}
                        value={v.sku ?? ''}
                        onChange={e => updateVariantField(idx, 'sku', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label">Barkod</label>
                      <input
                        className="form-select"
                        style={{ width: '100%' }}
                        value={v.barcode ?? ''}
                        onChange={e => updateVariantField(idx, 'barcode', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label">Stok</label>
                      <input
                        type="number" min="0"
                        className="form-select"
                        style={{ width: '100%' }}
                        value={v.inventoryQuantity}
                        onChange={e => updateVariantField(idx, 'inventoryQuantity', parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Görseller (sadece görüntüleme) */}
          {product.images.length > 0 && (
            <div className="panel-card">
              <div className="settings-section-title">Görseller</div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                gap: 10,
              }}>
                {product.images.map(img => (
                  <div key={img.id} style={{
                    aspectRatio: '1', borderRadius: 8,
                    overflow: 'hidden', border: '1px solid var(--border-color)',
                    background: 'var(--hover-bg)',
                  }}>
                    <img src={img.url} alt={img.altText ?? ''}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* SAĞ: META */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="panel-card">
            <div className="settings-section-title">Durum</div>
            <select
              className="form-select"
              style={{ width: '100%' }}
              value={status}
              onChange={e => setStatus(e.target.value)}
            >
              <option value="ACTIVE">Aktif (yayında)</option>
              <option value="DRAFT">Taslak</option>
              <option value="ARCHIVED">Arşiv</option>
            </select>
          </div>

          <div className="panel-card">
            <div className="settings-section-title">Organizasyon</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label className="form-label">Tedarikçi (vendor)</label>
                <input
                  className="form-select"
                  style={{ width: '100%' }}
                  value={vendor}
                  onChange={e => setVendor(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label">Ürün Tipi</label>
                <input
                  className="form-select"
                  style={{ width: '100%' }}
                  value={productType}
                  onChange={e => setProductType(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label">Etiketler (virgülle ayır)</label>
                <textarea
                  className="form-select"
                  style={{ width: '100%', minHeight: 70, fontFamily: 'inherit', resize: 'vertical' }}
                  value={tagsInput}
                  onChange={e => setTagsInput(e.target.value)}
                  placeholder="yaz, indirim, yeni-sezon"
                />
              </div>
            </div>
          </div>

          <div className="panel-card" style={{ background: 'var(--hover-bg)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              <strong>Shopify ID:</strong>
              <div style={{
                fontFamily: 'monospace', fontSize: 10,
                wordBreak: 'break-all', marginTop: 4,
              }}>{product.id}</div>
              <div style={{ marginTop: 8 }}>
                <strong>Handle:</strong> {product.handle}
              </div>
              <div style={{ marginTop: 8 }}>
                <strong>Toplam Stok:</strong> {product.totalInventory} adet
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
