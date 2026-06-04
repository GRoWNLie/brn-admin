'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ProductCreatePage() {
  const router = useRouter()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [vendor, setVendor] = useState('')
  const [productType, setProductType] = useState('')
  const [status, setStatus] = useState<'DRAFT' | 'ACTIVE'>('DRAFT')
  const [tagsInput, setTagsInput] = useState('')
  const [price, setPrice] = useState('0.00')
  const [sku, setSku] = useState('')
  const [stock, setStock] = useState('0')
  const [imageUrlsInput, setImageUrlsInput] = useState('')

  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  async function handleSave() {
    if (!title.trim()) {
      setMsg({ kind: 'error', text: 'Başlık zorunlu' })
      return
    }
    setSaving(true); setMsg(null)
    try {
      const res = await fetch('/api/shopify/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          descriptionHtml: description,
          vendor: vendor || undefined,
          productType: productType || undefined,
          status,
          tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
          price,
          sku: sku || undefined,
          inventoryQuantity: parseInt(stock, 10) || 0,
          imageUrls: imageUrlsInput.split('\n').map(u => u.trim()).filter(Boolean),
        }),
      })
      const data = await res.json()
      if (data.success && data.productId) {
        setMsg({ kind: 'success', text: '✅ Ürün oluşturuldu! Düzenleme sayfasına yönlendiriliyorsunuz...' })
        setTimeout(() => router.push(`/products/${encodeURIComponent(data.productId)}/edit`), 1500)
      } else {
        setMsg({ kind: 'error', text: `❌ ${data.message}` })
      }
    } catch (e: any) {
      setMsg({ kind: 'error', text: `❌ ${e?.message ?? 'İstek hatası'}` })
    } finally { setSaving(false) }
  }

  return (
    <div className="page-content">
      <div className="product-header">
        <div>
          <button
            onClick={() => router.push('/products')}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12, marginBottom: 4 }}
          >← Ürünler</button>
          <h1 className="page-title">Yeni Ürün</h1>
        </div>
        <div className="product-actions-right">
          <button className="btn-secondary" onClick={() => router.push('/products')}>İptal</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? '⏳ Oluşturuluyor...' : '💾 Shopify\'a Kaydet'}
          </button>
        </div>
      </div>

      {msg && (
        <div className="panel-card" style={{ borderLeft: `4px solid ${msg.kind === 'success' ? '#10B981' : '#DC2626'}`, whiteSpace: 'pre-wrap' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: msg.kind === 'success' ? '#065F46' : '#991B1B' }}>{msg.text}</div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="panel-card">
            <div className="settings-section-title">Ürün Bilgileri</div>
            <div>
              <label className="form-label">Başlık <span style={{ color: '#DC2626' }}>*</span></label>
              <input className="form-select" style={{ width: '100%' }} value={title}
                onChange={e => setTitle(e.target.value)} placeholder="Örn: Nike Air Max 90" />
            </div>
            <div style={{ marginTop: 12 }}>
              <label className="form-label">Açıklama (HTML)</label>
              <textarea className="form-select" style={{ width: '100%', minHeight: 140, fontFamily: 'inherit' }}
                value={description} onChange={e => setDescription(e.target.value)} />
            </div>
          </div>

          <div className="panel-card">
            <div className="settings-section-title">Fiyat &amp; Stok (Varsayılan Varyant)</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <div>
                <label className="form-label">Fiyat</label>
                <input type="number" step="0.01" min="0" className="form-select" style={{ width: '100%' }}
                  value={price} onChange={e => setPrice(e.target.value)} />
              </div>
              <div>
                <label className="form-label">SKU</label>
                <input className="form-select" style={{ width: '100%' }}
                  value={sku} onChange={e => setSku(e.target.value)} placeholder="SKU-001" />
              </div>
              <div>
                <label className="form-label">Stok (oluşturulduktan sonra ayarlanır)</label>
                <input type="number" min="0" className="form-select" style={{ width: '100%' }}
                  value={stock} onChange={e => setStock(e.target.value)} />
              </div>
            </div>
            <small style={{ color: 'var(--text-muted)', marginTop: 8 }}>
              💡 Ürün oluşturulduktan sonra düzenleme ekranından stok güncellenebilir.
            </small>
          </div>

          <div className="panel-card">
            <div className="settings-section-title">Görseller</div>
            <label className="form-label">Görsel URL'leri (her satıra 1 tane)</label>
            <textarea className="form-select" style={{ width: '100%', minHeight: 90, fontFamily: 'monospace', fontSize: 12 }}
              placeholder="https://cdn.example.com/image1.jpg&#10;https://cdn.example.com/image2.jpg"
              value={imageUrlsInput} onChange={e => setImageUrlsInput(e.target.value)} />
            <small style={{ color: 'var(--text-muted)' }}>
              Shopify bu URL'leri otomatik indirip kendi CDN'ine yükler.
            </small>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="panel-card">
            <div className="settings-section-title">Durum</div>
            <select className="form-select" style={{ width: '100%' }}
              value={status} onChange={e => setStatus(e.target.value as 'DRAFT' | 'ACTIVE')}>
              <option value="DRAFT">Taslak (yayında değil)</option>
              <option value="ACTIVE">Aktif (yayında)</option>
            </select>
          </div>

          <div className="panel-card">
            <div className="settings-section-title">Organizasyon</div>
            <div>
              <label className="form-label">Tedarikçi (vendor)</label>
              <input className="form-select" style={{ width: '100%' }} value={vendor} onChange={e => setVendor(e.target.value)} />
            </div>
            <div style={{ marginTop: 10 }}>
              <label className="form-label">Ürün Tipi</label>
              <input className="form-select" style={{ width: '100%' }} value={productType} onChange={e => setProductType(e.target.value)} />
            </div>
            <div style={{ marginTop: 10 }}>
              <label className="form-label">Etiketler (virgülle)</label>
              <textarea className="form-select" style={{ width: '100%', minHeight: 60, fontFamily: 'inherit' }}
                value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="yaz, indirim, yeni-sezon" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
