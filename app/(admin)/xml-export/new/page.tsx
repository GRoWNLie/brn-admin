'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const STEPS = [
  { num: 1, label: 'Kaynak' },
  { num: 2, label: 'Filtreler' },
  { num: 3, label: 'Eşleme' },
  { num: 4, label: 'Format' },
  { num: 5, label: 'Yayın' },
  { num: 6, label: 'Özet' },
]

// Shopify alanları — kullanıcının seçebileceği path'ler
const SHOPIFY_FIELDS = [
  { value: '', label: '— Seçiniz —' },
  { value: 'id', label: 'ID' },
  { value: 'title', label: 'Başlık (title)' },
  { value: 'handle', label: 'Slug (handle)' },
  { value: 'body_html', label: 'Açıklama (body_html)' },
  { value: 'vendor', label: 'Marka (vendor)' },
  { value: 'product_type', label: 'Kategori (product_type)' },
  { value: 'tags', label: 'Etiketler (tags)' },
  { value: 'status', label: 'Durum (status)' },
  { value: 'created_at', label: 'Oluşturma Tarihi' },
  { value: 'updated_at', label: 'Güncelleme Tarihi' },
  { value: 'variants[0].price', label: 'Fiyat (variants[0].price)' },
  { value: 'variants[0].compare_at_price', label: 'Eski Fiyat (compare_at_price)' },
  { value: 'variants[0].sku', label: 'SKU (variants[0].sku)' },
  { value: 'variants[0].barcode', label: 'Barkod (variants[0].barcode)' },
  { value: 'variants[0].inventory_quantity', label: 'Stok (inventory_quantity)' },
  { value: 'variants[0].weight', label: 'Ağırlık (weight)' },
  { value: 'images[0].src', label: '1. Görsel (images[0].src)' },
  { value: 'images[1].src', label: '2. Görsel' },
  { value: 'images[2].src', label: '3. Görsel' },
  { value: 'images[3].src', label: '4. Görsel' },
]

const FILTER_FIELDS = [
  { value: 'status', label: 'Durum (active/draft)' },
  { value: 'vendor', label: 'Marka' },
  { value: 'product_type', label: 'Kategori' },
  { value: 'tags', label: 'Etiketler' },
  { value: 'variants[0].price', label: 'Fiyat' },
  { value: 'variants[0].inventory_quantity', label: 'Stok' },
]

interface MappingRow {
  id: number
  tag: string
  field: string
}

interface FilterRow {
  id: number
  field: string
  operator: string
  value: string
}

const DEFAULT_MAPPING_ROWS: MappingRow[] = [
  { id: 1, tag: 'id', field: 'id' },
  { id: 2, tag: 'Name', field: 'title' },
  { id: 3, tag: 'Description', field: 'body_html' },
  { id: 4, tag: 'Brand', field: 'vendor' },
  { id: 5, tag: 'Category', field: 'product_type' },
  { id: 6, tag: 'Price', field: 'variants[0].price' },
  { id: 7, tag: 'Stock', field: 'variants[0].inventory_quantity' },
  { id: 8, tag: 'SKU', field: 'variants[0].sku' },
  { id: 9, tag: 'Image1', field: 'images[0].src' },
]

export default function XmlExportWizardPage() {
  const router = useRouter()
  const [activeStep, setActiveStep] = useState(1)
  const [busy, setBusy] = useState(false)
  const [globalError, setGlobalError] = useState('')
  const [origin, setOrigin] = useState('')

  // STEP 1 — Kaynak (Shopify)
  const [shopName, setShopName] = useState('xyc2un-pk.myshopify.com')
  const [title, setTitle] = useState('Toptancı XML Çıktısı')

  // STEP 2 — Filtreler
  const [filters, setFilters] = useState<FilterRow[]>([])

  // STEP 3 — Eşleme (XML tag → Shopify field)
  const [mappingRows, setMappingRows] = useState<MappingRow[]>(DEFAULT_MAPPING_ROWS)
  const [includeImages, setIncludeImages] = useState(true)
  const [includeVariants, setIncludeVariants] = useState(true)

  // STEP 4 — Format
  const [rootTag, setRootTag] = useState('products')
  const [itemTag, setItemTag] = useState('product')
  const [encoding, setEncoding] = useState('UTF-8')

  // STEP 5 — Yayın
  const [autoRefreshMin, setAutoRefreshMin] = useState(60)

  useEffect(() => {
    if (typeof window !== 'undefined') setOrigin(window.location.origin)
  }, [])

  function nextStep() { if (activeStep < 6) setActiveStep(activeStep + 1) }
  function prevStep() { if (activeStep > 1) setActiveStep(activeStep - 1) }

  function addMappingRow() {
    setMappingRows(prev => [...prev, { id: Date.now(), tag: '', field: '' }])
  }
  function removeMappingRow(id: number) {
    setMappingRows(prev => prev.filter(r => r.id !== id))
  }
  function updateMappingRow(id: number, key: 'tag' | 'field', value: string) {
    setMappingRows(prev => prev.map(r => r.id === id ? { ...r, [key]: value } : r))
  }

  function addFilter() {
    setFilters(prev => [...prev, { id: Date.now(), field: 'status', operator: '=', value: 'active' }])
  }
  function removeFilter(id: number) { setFilters(prev => prev.filter(f => f.id !== id)) }
  function updateFilter(id: number, key: keyof FilterRow, value: string) {
    setFilters(prev => prev.map(f => f.id === id ? { ...f, [key]: value } : f))
  }

  function buildMappingObject() {
    const obj: Record<string, string> = {}
    mappingRows.forEach(r => { if (r.tag && r.field) obj[r.tag] = r.field })
    return obj
  }

  function buildSlugPreview() {
    return title.toLowerCase()
      .replace(/[ğüşıöç]/g, c => ({ ğ: 'g', ü: 'u', ş: 's', ı: 'i', ö: 'o', ç: 'c' }[c]!))
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50)
  }

  async function startExport() {
    setBusy(true)
    setGlobalError('')
    try {
      const res = await fetch('/api/xml/exports/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          shop: shopName,
          rootTag,
          itemTag,
          encoding,
          mapping: buildMappingObject(),
          filters: filters.map(f => ({ field: f.field, operator: f.operator, value: f.value })),
          includeImages,
          includeVariants,
          autoRefreshMin,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.message || 'Kayıt başarısız')

      // İlk üretimi tetikle
      const genRes = await fetch(`/api/xml/exports/${data.exportId}/generate`, { method: 'POST' })
      const genData = await genRes.json()

      if (genData.success) {
        alert(`✅ BAŞARILI!\n\n${genData.message}\n\nPublic URL:\n${origin}/api/xml/feed/${data.slug}`)
        router.push('/xml-export')
      } else {
        setGlobalError(genData.message || 'XML üretim başarısız')
      }
    } catch (e: any) {
      setGlobalError(e.message || 'Beklenmedik hata')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="wizard-container">
      {/* STEPPER */}
      <div className="stepper-card">
        {STEPS.map(s => {
          const cls = s.num === activeStep ? 'active' : s.num < activeStep ? 'completed' : ''
          return (
            <button
              key={s.num}
              className={`w-step ${cls}`}
              onClick={() => s.num <= activeStep && setActiveStep(s.num)}
            >
              <span className="w-step-num">{s.num < activeStep ? '✓' : s.num}</span>
              {s.label}
            </button>
          )
        })}
      </div>

      {globalError && (
        <div className="wz-banner wz-banner-red" style={{ whiteSpace: 'pre-wrap' }}>
          ⚠️ {globalError}
        </div>
      )}

      {/* STEP 1 — KAYNAK */}
      {activeStep === 1 && (
        <>
          <div className="wz-banner wz-banner-blue">
            📤
            <div>
              <strong>Dışa Aktarma (Export) Modu</strong>
              <div style={{ fontSize: 13, marginTop: 4 }}>
                Shopify mağazandaki ürünleri XML formatına dönüştürerek tedarikçilerin/pazaryerlerinin tüketebileceği bir public feed URL'i oluştur.
              </div>
            </div>
          </div>

          <div className="wz-block">
            <h3>1. Kaynak Tanımı</h3>
            <p className="wz-desc">Hangi Shopify mağazadan ürünler dışa aktarılacak ve feed başlığı ne olacak.</p>
            <div className="wz-grid">
              <div>
                <label className="wz-label">Dışa Aktarma Başlığı</label>
                <input className="wz-input" value={title} onChange={e => setTitle(e.target.value)} />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                  Public URL slug önizleme: <code>/api/xml/feed/{buildSlugPreview()}</code>
                </div>
              </div>
              <div>
                <label className="wz-label">Shopify Mağaza</label>
                <input className="wz-input" value={shopName} onChange={e => setShopName(e.target.value)}
                  placeholder="xxx.myshopify.com" />
              </div>
            </div>
          </div>

          <div className="wz-footer">
            <button className="wz-btn wz-btn-light" onClick={() => router.push('/xml-export')}>← İptal</button>
            <button className="wz-btn wz-btn-success" onClick={nextStep} disabled={!title || !shopName}>
              Devam Et (Filtreler) →
            </button>
          </div>
        </>
      )}

      {/* STEP 2 — FİLTRELER */}
      {activeStep === 2 && (
        <>
          <div className="wz-block">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3>Ürün Filtreleri</h3>
                <p className="wz-desc">Sadece kriterleri karşılayan ürünler XML çıktısına dahil edilir. Filtre yoksa tüm ürünler dahil olur.</p>
              </div>
              <button className="wz-btn wz-btn-dark" onClick={addFilter}>➕ Filtre Ekle</button>
            </div>

            {filters.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', background: 'var(--hover-bg)', borderRadius: 10 }}>
                Filtre yok — tüm ürünler dışa aktarılır.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {filters.map(f => (
                  <div key={f.id} style={{ display: 'grid', gridTemplateColumns: '1fr 130px 1fr 80px', gap: 10, alignItems: 'end' }}>
                    <div>
                      <label className="wz-label">Alan</label>
                      <select className="wz-select" value={f.field}
                        onChange={e => updateFilter(f.id, 'field', e.target.value)}>
                        {FILTER_FIELDS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="wz-label">Operatör</label>
                      <select className="wz-select" value={f.operator}
                        onChange={e => updateFilter(f.id, 'operator', e.target.value)}>
                        <option value="=">=</option>
                        <option value="!=">!=</option>
                        <option value=">">{'>'}</option>
                        <option value="<">{'<'}</option>
                        <option value="contains">içerir</option>
                      </select>
                    </div>
                    <div>
                      <label className="wz-label">Değer</label>
                      <input className="wz-input" value={f.value}
                        onChange={e => updateFilter(f.id, 'value', e.target.value)} />
                    </div>
                    <button className="wz-btn wz-btn-danger" onClick={() => removeFilter(f.id)}>Sil</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="wz-footer">
            <button className="wz-btn wz-btn-light" onClick={prevStep}>← Geri (Kaynak)</button>
            <button className="wz-btn wz-btn-success" onClick={nextStep}>Devam Et (Eşleme) →</button>
          </div>
        </>
      )}

      {/* STEP 3 — EŞLEME */}
      {activeStep === 3 && (
        <>
          <div className="wz-banner wz-banner-blue">
            🔀
            <div>
              <strong>XML Tag ↔ Shopify Field Eşleme</strong>
              <div style={{ fontSize: 13, marginTop: 4 }}>
                Sol kolondaki XML etiketi, sağdaki Shopify alanından değer alacak.
              </div>
            </div>
          </div>

          <div className="wz-block">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Alan Eşleme</h3>
              <button className="wz-btn wz-btn-dark" onClick={addMappingRow}>➕ Yeni Eşleme</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {mappingRows.map(r => (
                <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 80px', gap: 10, alignItems: 'end' }}>
                  <div>
                    <label className="wz-label">XML Etiketi (&lt;Tag&gt;)</label>
                    <input className="wz-input" value={r.tag}
                      onChange={e => updateMappingRow(r.id, 'tag', e.target.value)}
                      placeholder="Örn: Name" />
                  </div>
                  <div>
                    <label className="wz-label">Shopify Alanı</label>
                    <select className="wz-select" value={r.field}
                      onChange={e => updateMappingRow(r.id, 'field', e.target.value)}>
                      {SHOPIFY_FIELDS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <button className="wz-btn wz-btn-danger" onClick={() => removeMappingRow(r.id)}>Sil</button>
                </div>
              ))}
            </div>
          </div>

          <div className="wz-block">
            <h3>Ek Ayarlar</h3>
            <label style={{ display: 'flex', gap: 12, padding: '12px 16px', background: 'var(--hover-bg)', borderRadius: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={includeImages}
                onChange={e => setIncludeImages(e.target.checked)} />
              <div>
                <strong>Tüm Görselleri Dahil Et</strong>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Ürüne ait tüm görseller `&lt;Images&gt;` bloğuna eklenir.
                </div>
              </div>
            </label>
            <label style={{ display: 'flex', gap: 12, padding: '12px 16px', background: 'var(--hover-bg)', borderRadius: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={includeVariants}
                onChange={e => setIncludeVariants(e.target.checked)} />
              <div>
                <strong>Tüm Varyantları Dahil Et</strong>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Çoklu varyantlar `&lt;Variants&gt;` bloğuna eklenir.
                </div>
              </div>
            </label>
          </div>

          <div className="wz-footer">
            <button className="wz-btn wz-btn-light" onClick={prevStep}>← Geri (Filtreler)</button>
            <button className="wz-btn wz-btn-success" onClick={nextStep}>Devam Et (Format) →</button>
          </div>
        </>
      )}

      {/* STEP 4 — FORMAT */}
      {activeStep === 4 && (
        <>
          <div className="wz-block">
            <h3>XML Format Ayarları</h3>
            <p className="wz-desc">Üretilecek XML belgesinin kök etiketi, ürün etiketi ve karakter kodlaması.</p>
            <div className="wz-grid">
              <div>
                <label className="wz-label">Kök Etiket (root tag)</label>
                <input className="wz-input" value={rootTag} onChange={e => setRootTag(e.target.value)} />
                <small style={{ color: 'var(--text-muted)' }}>Örn: products, urunler, root</small>
              </div>
              <div>
                <label className="wz-label">Ürün Etiketi (item tag)</label>
                <input className="wz-input" value={itemTag} onChange={e => setItemTag(e.target.value)} />
                <small style={{ color: 'var(--text-muted)' }}>Örn: product, urun, item</small>
              </div>
              <div>
                <label className="wz-label">Karakter Kodlaması</label>
                <select className="wz-select" value={encoding} onChange={e => setEncoding(e.target.value)}>
                  <option>UTF-8</option>
                  <option>ISO-8859-9</option>
                  <option>windows-1254</option>
                </select>
              </div>
            </div>
          </div>

          <div className="wz-block">
            <h3>Örnek Çıktı</h3>
            <pre style={{
              background: '#0F172A', color: '#A7F3D0', padding: 16, borderRadius: 10,
              fontSize: 12, overflowX: 'auto', lineHeight: 1.6,
            }}>
{`<?xml version="1.0" encoding="${encoding}"?>
<${rootTag}>
  <${itemTag}>
${mappingRows.filter(r => r.tag && r.field).slice(0, 5).map(r =>
  `    <${r.tag}>(...${r.field})</${r.tag}>`
).join('\n')}
  </${itemTag}>
  ...
</${rootTag}>`}
            </pre>
          </div>

          <div className="wz-footer">
            <button className="wz-btn wz-btn-light" onClick={prevStep}>← Geri (Eşleme)</button>
            <button className="wz-btn wz-btn-success" onClick={nextStep}>Devam Et (Yayın) →</button>
          </div>
        </>
      )}

      {/* STEP 5 — YAYIN */}
      {activeStep === 5 && (
        <>
          <div className="wz-block">
            <h3>Yayın Ayarları</h3>
            <p className="wz-desc">XML feed'i tedarikçilere/pazaryerlerine paylaşabileceğin public bir URL üzerinden yayınlanır.</p>

            <div>
              <label className="wz-label">Otomatik Yenileme Aralığı</label>
              <select className="wz-select" value={autoRefreshMin}
                onChange={e => setAutoRefreshMin(parseInt(e.target.value))}
                style={{ maxWidth: 320 }}>
                <option value={15}>Her 15 dakika</option>
                <option value={30}>Her 30 dakika</option>
                <option value={60}>Her 1 saat</option>
                <option value={180}>Her 3 saat</option>
                <option value={360}>Her 6 saat</option>
                <option value={1440}>Her 24 saat</option>
              </select>
              <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: 6 }}>
                Belirtilen süre boyunca XML cache'lenir, sonra Shopify'dan yeniden çekilir.
              </small>
            </div>
          </div>

          <div className="wz-banner wz-banner-green">
            🌍
            <div>
              <strong>Public Feed URL (Önizleme)</strong>
              <div style={{ fontSize: 13, marginTop: 6, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                {origin}/api/xml/feed/<strong>{buildSlugPreview()}</strong>
              </div>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                Kaydettikten sonra bu URL'yi tedarikçilerle paylaşabilirsin.
              </div>
            </div>
          </div>

          <div className="wz-footer">
            <button className="wz-btn wz-btn-light" onClick={prevStep}>← Geri (Format)</button>
            <button className="wz-btn wz-btn-success" onClick={nextStep}>Devam Et (Özet) →</button>
          </div>
        </>
      )}

      {/* STEP 6 — ÖZET */}
      {activeStep === 6 && (
        <>
          <div className="wz-block" style={{ borderTop: '6px solid #10B981' }}>
            <h3 style={{ fontSize: 22 }}>📋 Dışa Aktarma Özeti</h3>
            <p className="wz-desc">Ayarları kontrol edip "Oluştur ve Yayınla" butonuna basın.</p>
          </div>

          <div className="wz-block">
            <h3>⚙️ Konfigürasyon</h3>
            <div>
              <div className="wz-summary-row"><strong>1. Başlık</strong><div className="val">{title}</div></div>
              <div className="wz-summary-row"><strong>2. Shopify Mağaza</strong><div className="val">{shopName}</div></div>
              <div className="wz-summary-row"><strong>3. Filtreler</strong><div className="val">{filters.length === 0 ? 'Yok (tüm ürünler)' : `${filters.length} filtre uygulanacak`}</div></div>
              <div className="wz-summary-row"><strong>4. Eşlenen Alan</strong><div className="val">{mappingRows.filter(r => r.tag && r.field).length} alan</div></div>
              <div className="wz-summary-row"><strong>5. Format</strong><div className="val">&lt;{rootTag}&gt; / &lt;{itemTag}&gt; — {encoding}</div></div>
              <div className="wz-summary-row"><strong>6. Görseller / Varyantlar</strong><div className="val">{includeImages ? '✅ Tüm görseller' : '❌'} | {includeVariants ? '✅ Tüm varyantlar' : '❌'}</div></div>
              <div className="wz-summary-row"><strong>7. Yenileme</strong><div className="val">Her {autoRefreshMin} dakikada bir</div></div>
              <div className="wz-summary-row">
                <strong>8. Public URL</strong>
                <div className="val" style={{ fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all' }}>
                  {origin}/api/xml/feed/{buildSlugPreview()}
                </div>
              </div>
            </div>
          </div>

          <div className="wz-footer">
            <button className="wz-btn wz-btn-light" onClick={prevStep} disabled={busy}>← Düzenle</button>
            <button className="wz-btn wz-btn-success" onClick={startExport} disabled={busy}
              style={{ padding: '14px 28px', fontSize: 15 }}>
              {busy ? '⏳ XML Üretiliyor...' : '🚀 Oluştur ve Yayınla'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
