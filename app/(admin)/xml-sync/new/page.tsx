'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const STEPS = [
  { num: 1, label: 'Kaynak' },
  { num: 2, label: 'Eşleme' },
  { num: 3, label: 'Özelleştirmeler' },
  { num: 4, label: 'Filtreler' },
  { num: 5, label: 'Ayarlar' },
  { num: 6, label: 'Özet' },
]

const MAPPING_FIELDS: Array<{ key: keyof MappingState; label: string; desc: string }> = [
  { key: 'primary', label: 'Ürün Tanımlayıcı (ID)', desc: 'Her ürünü benzersiz tanımlayan alan (Product_id, sku vb.)' },
  { key: 'title', label: 'Ürün Başlığı', desc: 'Shopify ürün adı (Name, title)' },
  { key: 'desc', label: 'Ürün Açıklaması', desc: 'Ürün detay metni' },
  { key: 'brand', label: 'Marka (Vendor)', desc: 'Tedarikçi/Marka adı' },
  { key: 'category', label: 'Kategori (Product Type)', desc: 'Ürün kategorisi/tipi' },
  { key: 'sku', label: 'Varyant SKU', desc: 'Stok takip kodu' },
  { key: 'barcode', label: 'Barkod', desc: 'Barkod (GTIN/EAN)' },
  { key: 'price', label: 'Satış Fiyatı', desc: 'Variants[].price' },
  { key: 'comparePrice', label: 'Karşılaştırma Fiyatı', desc: 'Üstü çizili eski fiyat' },
  { key: 'stock', label: 'Stok Adedi', desc: 'inventory_quantity' },
]

const AUTO_MATCH_MAP: Record<string, string[]> = {
  primary: ['Product_id', 'id', 'Urun_id', 'sku', 'Product_code'],
  title: ['Name', 'title', 'Baslik', 'UrunAdi', 'ProductName'],
  desc: ['Description', 'aciklama', 'detay', 'description'],
  brand: ['Brand', 'vendor', 'marka', 'Marka'],
  category: ['category', 'Kategori', 'kategori', 'Category'],
  sku: ['Product_code', 'sku', 'kod', 'Model'],
  barcode: ['Barcode', 'barkod', 'gtin', 'EAN'],
  price: ['Price2', 'Price', 'fiyat', 'satis_fiyati', 'price'],
  comparePrice: ['Price1', 'old_price', 'piyasa_fiyati', 'compare_at_price'],
  stock: ['Stock', 'stock', 'stok', 'miktar', 'quantity'],
}

interface MappingState {
  primary: string
  title: string
  desc: string
  brand: string
  category: string
  sku: string
  barcode: string
  price: string
  comparePrice: string
  stock: string
  images: string[]
}

interface RuleState {
  id: number
  targetField: string
  calcMethod: string
  percentage: number
}

interface FilterState {
  id: number
  type: 'import' | 'update'
  field: string
  operator: string
  value: string
}

export default function XmlWizardPage() {
  const router = useRouter()
  const [activeStep, setActiveStep] = useState(1)
  const [busy, setBusy] = useState(false)
  const [globalError, setGlobalError] = useState('')

  // STEP 1 — KAYNAK
  const [feedTitle, setFeedTitle] = useState('Toptancı XML Entegrasyonu')
  const [xmlUrl, setXmlUrl] = useState('https://xmlbankasi.com/feed.xml')
  const [analyzing, setAnalyzing] = useState(false)
  const [totalProducts, setTotalProducts] = useState(0)
  const [previewTags, setPreviewTags] = useState<string[]>([])
  const [previewProducts, setPreviewProducts] = useState<Record<string, unknown>[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [importMode, setImportMode] = useState<'all' | 'selected' | 'limit'>('all')
  const [testLimit, setTestLimit] = useState(5)

  // STEP 2 — EŞLEME
  const [mapping, setMapping] = useState<MappingState>({
    primary: '', title: '', desc: '', brand: '', category: '',
    sku: '', barcode: '', price: '', comparePrice: '', stock: '',
    images: [],
  })

  // STEP 3 — ÖZELLEŞTİRMELER (kurallar)
  const [rules, setRules] = useState<RuleState[]>([])

  // STEP 4 — FİLTRELER
  const [filters, setFilters] = useState<FilterState[]>([])

  // STEP 5 — AYARLAR
  const [publishChannel, setPublishChannel] = useState('Online Mağaza')
  const [targetCollection, setTargetCollection] = useState('Toptancı Ürünleri')
  const [allowUpdate, setAllowUpdate] = useState(true)
  const [allowNew, setAllowNew] = useState(true)
  const [criticalStockEnabled, setCriticalStockEnabled] = useState(true)
  const [criticalStockThreshold, setCriticalStockThreshold] = useState(3)

  // STEP 1 — XML analiz
  async function analyzeXml() {
    if (!xmlUrl) { alert('Lütfen geçerli bir XML adresi girin!'); return }
    setAnalyzing(true)
    setGlobalError('')
    try {
      const res = await fetch('/api/xml/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xmlUrl }),
      })
      const data = await res.json()
      if (data.success) {
        setTotalProducts(data.totalProducts)
        setPreviewTags(data.tags || [])
        setPreviewProducts(data.products || [])
        autoMatchMapping(data.tags || [])
      } else {
        alert('XML Okuma Hatası: ' + (data.message || ''))
      }
    } catch (e: any) {
      alert('Sunucu hatası: ' + (e?.message || ''))
    } finally {
      setAnalyzing(false)
    }
  }

  function autoMatchMapping(tags: string[]) {
    const newMap: MappingState = { ...mapping, images: [] }
    for (const key of Object.keys(AUTO_MATCH_MAP) as Array<keyof typeof AUTO_MATCH_MAP>) {
      const candidates = AUTO_MATCH_MAP[key]
      const found = candidates.find(c => tags.includes(c))
      ;(newMap as any)[key] = found || tags[0] || ''
    }
    // Otomatik image alanları
    newMap.images = tags.filter(t => /image|resim|gorsel/i.test(t)).slice(0, 5)
    setMapping(newMap)
  }

  function toggleProductSelect(pId: string) {
    setSelectedIds(prev =>
      prev.includes(pId) ? prev.filter(x => x !== pId) : [...prev, pId]
    )
  }

  function getProductId(p: Record<string, unknown>, idx: number) {
    return String(p.Product_id ?? p.id ?? p.Product_code ?? p.sku ?? idx)
  }

  // STEP 3 — Rules
  function addRule() {
    setRules(prev => [...prev, {
      id: Date.now(),
      targetField: 'price',
      calcMethod: 'Yüzde Ekle (% Artır)',
      percentage: 20,
    }])
  }
  function removeRule(id: number) { setRules(prev => prev.filter(r => r.id !== id)) }

  // STEP 4 — Filters
  function addFilter(type: 'import' | 'update') {
    setFilters(prev => [...prev, {
      id: Date.now() + Math.random(),
      type,
      field: 'stock',
      operator: '>',
      value: '0',
    }])
  }
  function removeFilter(id: number) { setFilters(prev => prev.filter(f => f.id !== id)) }

  function updateMapping<K extends keyof MappingState>(key: K, value: MappingState[K]) {
    setMapping(prev => ({ ...prev, [key]: value }))
  }

  function nextStep() { if (activeStep < 6) setActiveStep(activeStep + 1) }
  function prevStep() { if (activeStep > 1) setActiveStep(activeStep - 1) }

  // STEP 6 — Final: kaydet + senkron
  async function startIntegration() {
    setBusy(true)
    setGlobalError('')
    try {
      // 1) Feed + rules + filters + settings kaydet
      const saveRes = await fetch('/api/xml/feeds/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: feedTitle,
          url: xmlUrl,
          productCount: totalProducts,
          rules: rules.map(r => ({
            ruleType: 'Fiyat',
            targetField: r.targetField,
            calcMethod: r.calcMethod,
            mathSteps: [{ op: 'multiply', val: 1 + r.percentage / 100 }],
            roundingType: 'Yuvarla (varsayılan)',
            roundingDecimals: 2,
            fixedDecimalValue: 99,
          })),
          filters: {
            import: filters.filter(f => f.type === 'import').map(f => ({
              field: f.field, operator: f.operator, value: f.value,
            })),
            update: filters.filter(f => f.type === 'update').map(f => ({
              field: f.field, operator: f.operator, value: f.value,
            })),
          },
          settings: {
            publishChannel, targetCollection,
            allowUpdate, allowNew,
            criticalStockEnabled, criticalStockThreshold,
          },
        }),
      })
      const saveData = await saveRes.json()
      if (!saveData.success) {
        throw new Error(saveData.message || 'Feed kaydı başarısız')
      }
      const feedId = saveData.feedId

      // 2) Mapping kaydet
      await fetch('/api/xml/feeds/save-mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedId, mappingData: mapping }),
      })

      // 3) Shopify'a sync — test modunu da gönder
      const testSettings = {
        importMode,
        selectedProductIds: selectedIds,
        testLimit: importMode === 'limit' ? testLimit : null,
      }
      const syncRes = await fetch(`/api/xml/feeds/${feedId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testSettings }),
      })
      const syncData = await syncRes.json()

      if (syncData.success) {
        alert(`🚀 BAŞARILI!\n\n${syncData.message}\n\nAktarılan: ${syncData.syncedCount} / ${syncData.totalCount} ürün`)
        router.push('/xml-sync')
      } else {
        setGlobalError(syncData.message || 'Senkronizasyon başarısız')
      }
    } catch (e: any) {
      setGlobalError(e?.message || 'Beklenmedik hata')
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

      {/* ----- STEP 1: KAYNAK ----- */}
      {activeStep === 1 && (
        <>
          <div className="wz-banner wz-banner-blue">
            📦
            <div>
              <strong>Tam İçe Aktarma (Full Import) Modu Aktif</strong>
              <div style={{ fontSize: 13, marginTop: 4 }}>
                Bu akış, harici tedarikçi ürünlerini mağazanızda uçtan uca oluşturur ve günceller.
              </div>
            </div>
          </div>

          <div className="wz-block">
            <h3>1. Entegrasyon ve Kaynak Tanımı</h3>
            <p className="wz-desc">Tedarikçinizden aldığınız XML bağlantısını ve mağaza atamasını yapılandırın.</p>

            <div className="wz-grid">
              <div>
                <label className="wz-label">Entegrasyon Başlığı</label>
                <input className="wz-input" value={feedTitle} onChange={e => setFeedTitle(e.target.value)} />
              </div>
              <div>
                <label className="wz-label">Shopify Envanter Konumu</label>
                <select className="wz-select">
                  <option>Ana Depo (Ümraniye)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 260 }}>
                <label className="wz-label">Dosya URL Bağlantısı (XML Linki)</label>
                <input className="wz-input" type="url" value={xmlUrl}
                  onChange={e => setXmlUrl(e.target.value)} />
              </div>
              <button className="wz-btn wz-btn-dark" onClick={analyzeXml} disabled={analyzing}>
                {analyzing ? '⏳ Okunuyor...' : '⚡ Önizlemeyi Yenile'}
              </button>
            </div>
          </div>

          {/* Önizleme tablosu */}
          <div className="wz-block">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>
                {totalProducts === 0
                  ? '📦 XML linki girip "Önizlemeyi Yenile" butonuna basın.'
                  : <>✨ <span style={{ color: '#2563EB' }}>{totalProducts}</span> üründen ilk {previewProducts.length} tanesi önizleniyor.</>}
              </strong>
            </div>

            {previewTags.length > 0 && (
              <div className="wz-table-scroll">
                <table className="wz-preview-table">
                  <thead>
                    <tr>
                      <th style={{ width: 50, textAlign: 'center' }}>Seç</th>
                      {previewTags.map(t => <th key={t}>{t}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {previewProducts.map((p, idx) => {
                      const pId = getProductId(p, idx)
                      return (
                        <tr key={idx}>
                          <td style={{ textAlign: 'center' }}>
                            <input type="checkbox"
                              checked={selectedIds.includes(pId)}
                              onChange={() => toggleProductSelect(pId)} />
                          </td>
                          {previewTags.map(t => {
                            let v: any = p[t]
                            if (typeof v === 'object' && v !== null) v = '[Karma Alt Ağaç]'
                            return <td key={t}>{String(v ?? '')}</td>
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Test modu */}
          <div className="wz-block" style={{ borderLeft: '6px solid #8B5CF6' }}>
            <h3>🧪 Test Aktarımı ve Ürün Seçimi</h3>
            <p className="wz-desc">XML'den binlerce ürünü tek seferde aktarmak yerine, sistemin nasıl çalıştığını görmek için test seçimi yapabilirsiniz.</p>

            {[
              { val: 'all', title: 'XML\'deki Tüm Ürünleri Aktar', desc: 'Tüm ürünler eşleme kurallarına göre Shopify\'a aktarılır.' },
              { val: 'selected', title: 'Sadece Tablodan Seçtiğim Ürünleri Aktar', desc: 'Yukarıdaki önizleme tablosundan seçtiğiniz ürünleri test eder.' },
              { val: 'limit', title: 'İlk X Adet Ürünü Test Olarak Aktar', desc: 'XML\'deki ilk N ürünü Shopify\'a basar.' },
            ].map(opt => (
              <label key={opt.val} style={{
                background: '#FFF', padding: '14px 18px', borderRadius: 10,
                border: '1px solid #C4B5FD', display: 'flex', gap: 14, cursor: 'pointer',
              }}>
                <input type="radio" name="importMode" value={opt.val}
                  checked={importMode === opt.val}
                  onChange={e => setImportMode(e.target.value as any)} />
                <div style={{ flex: 1 }}>
                  <strong style={{ color: '#4C1D95' }}>{opt.title}</strong>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{opt.desc}</div>
                  {opt.val === 'limit' && importMode === 'limit' && (
                    <div style={{ marginTop: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#6D28D9' }}>Adet:</span>
                      <input type="number" min={1} max={100} value={testLimit}
                        onChange={e => setTestLimit(parseInt(e.target.value) || 5)}
                        className="wz-input" style={{ width: 90 }} />
                    </div>
                  )}
                </div>
              </label>
            ))}
          </div>

          <div className="wz-footer">
            <button className="wz-btn wz-btn-light" onClick={() => router.push('/xml-sync')}>
              ← İptal
            </button>
            <button className="wz-btn wz-btn-success" onClick={nextStep}
              disabled={previewTags.length === 0}>
              Kaydet ve Devam Et (Eşleme) →
            </button>
          </div>
        </>
      )}

      {/* ----- STEP 2: EŞLEME ----- */}
      {activeStep === 2 && (
        <>
          <div className="wz-banner wz-banner-blue">
            ℹ️
            <div>
              <strong>Shopify alanlarını feed alanlarınızla eşleştirin.</strong>
              <div style={{ fontSize: 13, marginTop: 4 }}>
                Otomatik eşleme yapıldı, gerekirse aşağıdan düzenleyin.
              </div>
            </div>
          </div>

          <div className="wz-block">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Alan Eşleme</h3>
              <button className="wz-btn wz-btn-light" onClick={() => autoMatchMapping(previewTags)}>
                ✨ Otomatik Eşleştir
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {MAPPING_FIELDS.map(f => (
                <div key={f.key} className="wz-map-row">
                  <div>
                    <strong>{f.label}</strong>
                    <small>{f.desc}</small>
                  </div>
                  <select
                    className="wz-select"
                    value={mapping[f.key] as string}
                    onChange={e => updateMapping(f.key, e.target.value as any)}
                  >
                    <option value="">— Seçiniz —</option>
                    {previewTags.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <span className="wz-badge">
                    {mapping[f.key] ? 'Eşleşti' : 'Boş'}
                  </span>
                </div>
              ))}

              {/* Görseller */}
              <div className="wz-map-row" style={{ gridTemplateColumns: '220px 1fr' }}>
                <div>
                  <strong>Görseller (Image fields)</strong>
                  <small>Birden fazla görsel alanı seçin (Image1, Image2...)</small>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {previewTags.map(t => {
                    const checked = mapping.images.includes(t)
                    return (
                      <label key={t} style={{
                        background: checked ? '#DBEAFE' : 'var(--bg-panel)',
                        border: `1px solid ${checked ? '#2563EB' : 'var(--border-color)'}`,
                        padding: '5px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                      }}>
                        <input type="checkbox" checked={checked}
                          onChange={() => {
                            setMapping(p => ({
                              ...p,
                              images: checked
                                ? p.images.filter(i => i !== t)
                                : [...p.images, t],
                            }))
                          }}
                          style={{ marginRight: 6 }} />
                        {t}
                      </label>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="wz-footer">
            <button className="wz-btn wz-btn-light" onClick={prevStep}>← Geri (Kaynak)</button>
            <button className="wz-btn wz-btn-success" onClick={nextStep}>
              Kaydet ve Devam Et (Özelleştirmeler) →
            </button>
          </div>
        </>
      )}

      {/* ----- STEP 3: ÖZELLEŞTİRMELER ----- */}
      {activeStep === 3 && (
        <>
          <div className="wz-block">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3>Özelleştirmeler ve Fiyat Kuralları</h3>
                <p className="wz-desc">XML'den gelen fiyatları dönüştürmek için kurallar ekleyin.</p>
              </div>
              <button className="wz-btn wz-btn-dark" onClick={addRule}>➕ Kural Ekle</button>
            </div>

            {rules.length === 0 ? (
              <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)', background: 'var(--hover-bg)', borderRadius: 10 }}>
                Henüz kural eklenmedi. Ham XML değerleri kullanılacak.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {rules.map(r => (
                  <div key={r.id} className="wz-rule-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong>💰 Fiyat Kuralı</strong>
                      <button className="wz-btn wz-btn-danger" style={{ padding: '6px 12px', fontSize: 12 }}
                        onClick={() => removeRule(r.id)}>Kaldır</button>
                    </div>
                    <div className="wz-grid">
                      <div>
                        <label className="wz-label">Hedef Alan</label>
                        <select className="wz-select" value={r.targetField}
                          onChange={e => setRules(p => p.map(x => x.id === r.id ? { ...x, targetField: e.target.value } : x))}>
                          <option value="price">Fiyat (price)</option>
                          <option value="comparePrice">Karşılaştırma Fiyatı</option>
                        </select>
                      </div>
                      <div>
                        <label className="wz-label">Hesaplama</label>
                        <select className="wz-select" value={r.calcMethod}
                          onChange={e => setRules(p => p.map(x => x.id === r.id ? { ...x, calcMethod: e.target.value } : x))}>
                          <option>Yüzde Ekle (% Artır)</option>
                          <option>Yüzde Düş (% İndirim)</option>
                        </select>
                      </div>
                      <div>
                        <label className="wz-label">Yüzde (%)</label>
                        <input type="number" className="wz-input" value={r.percentage}
                          onChange={e => setRules(p => p.map(x => x.id === r.id ? { ...x, percentage: parseFloat(e.target.value) || 0 } : x))} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="wz-footer">
            <button className="wz-btn wz-btn-light" onClick={prevStep}>← Geri (Eşleme)</button>
            <button className="wz-btn wz-btn-success" onClick={nextStep}>
              Devam Et (Filtreler) →
            </button>
          </div>
        </>
      )}

      {/* ----- STEP 4: FİLTRELER ----- */}
      {activeStep === 4 && (
        <>
          <div className="wz-block">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3>Ürün Filtreleme Kuralları</h3>
                <p className="wz-desc">Sadece belirli kriterlere uyan ürünleri mağazaya aktarın.</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="wz-btn wz-btn-light" onClick={() => addFilter('import')}>➕ İçe Aktarma</button>
                <button className="wz-btn wz-btn-dark" onClick={() => addFilter('update')}>➕ Güncelleme</button>
              </div>
            </div>
          </div>

          {(['import', 'update'] as const).map(type => {
            const list = filters.filter(f => f.type === type)
            const borderClr = type === 'import' ? '#2563EB' : '#10B981'
            return (
              <div key={type} className="wz-block" style={{ borderLeft: `6px solid ${borderClr}` }}>
                <h3>{type === 'import' ? '📦 İçe Aktarma Filtreleri' : '⚡ Güncelleme Filtreleri'}</h3>
                {list.length === 0 ? (
                  <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
                    Filtre eklenmedi.
                  </div>
                ) : list.map(f => (
                  <div key={f.id} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 1fr 80px', gap: 10, alignItems: 'end' }}>
                    <div>
                      <label className="wz-label">Alan</label>
                      <select className="wz-select" value={f.field}
                        onChange={e => setFilters(p => p.map(x => x.id === f.id ? { ...x, field: e.target.value } : x))}>
                        {previewTags.length > 0
                          ? previewTags.map(t => <option key={t}>{t}</option>)
                          : ['stock', 'price', 'category', 'brand'].map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="wz-label">Operatör</label>
                      <select className="wz-select" value={f.operator}
                        onChange={e => setFilters(p => p.map(x => x.id === f.id ? { ...x, operator: e.target.value } : x))}>
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
                        onChange={e => setFilters(p => p.map(x => x.id === f.id ? { ...x, value: e.target.value } : x))} />
                    </div>
                    <button className="wz-btn wz-btn-danger" onClick={() => removeFilter(f.id)}>Sil</button>
                  </div>
                ))}
              </div>
            )
          })}

          <div className="wz-footer">
            <button className="wz-btn wz-btn-light" onClick={prevStep}>← Geri (Özelleştirmeler)</button>
            <button className="wz-btn wz-btn-success" onClick={nextStep}>
              Devam Et (Ayarlar) →
            </button>
          </div>
        </>
      )}

      {/* ----- STEP 5: AYARLAR ----- */}
      {activeStep === 5 && (
        <>
          <div className="wz-banner wz-banner-yellow">
            🏬
            <div>
              <strong>Bağlı Shopify Mağazası</strong>
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                {process.env.NEXT_PUBLIC_SHOPIFY_SHOP || 'xyc2un-pk.myshopify.com'}
              </div>
            </div>
          </div>

          <div className="wz-block">
            <h3>1. Yayın Kanalları ve Koleksiyon</h3>
            <p className="wz-desc">Ürünlerin hangi kanalda ve hangi koleksiyonda yayınlanacağını seçin.</p>
            <div className="wz-grid">
              <div>
                <label className="wz-label">Satış Kanalı</label>
                <select className="wz-select" value={publishChannel}
                  onChange={e => setPublishChannel(e.target.value)}>
                  <option>Online Mağaza</option>
                  <option>B2B Kanalı</option>
                  <option>POS Kanalı</option>
                  <option>Tüm Kanallar</option>
                </select>
              </div>
              <div>
                <label className="wz-label">Otomatik Koleksiyon</label>
                <input className="wz-input" value={targetCollection}
                  onChange={e => setTargetCollection(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="wz-block">
            <h3>2. İçe Aktarma Davranışı</h3>
            <p className="wz-desc">Feed değişikliklerinde sistemin nasıl davranacağını seçin.</p>
            <label style={{ display: 'flex', gap: 12, padding: '12px 16px', background: 'var(--hover-bg)', borderRadius: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={allowUpdate} onChange={e => setAllowUpdate(e.target.checked)} />
              <div>
                <strong>Mevcut Ürünleri Güncellemeye İzin Ver</strong>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Tedarikçi fiyatı/stoğu değiştirdiğinde otomatik güncellenir.
                </div>
              </div>
            </label>
            <label style={{ display: 'flex', gap: 12, padding: '12px 16px', background: 'var(--hover-bg)', borderRadius: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={allowNew} onChange={e => setAllowNew(e.target.checked)} />
              <div>
                <strong>Yeni Ürün Eklemeye İzin Ver</strong>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Tedarikçi yeni ürün eklediğinde mağazada oluşturulur.
                </div>
              </div>
            </label>
          </div>

          <div className="wz-block" style={{ borderLeft: '6px solid #10B981' }}>
            <h3>3. Kritik Stok Eşiği (Safety Stock)</h3>
            <p className="wz-desc">Belirli limitin altındaki ürünleri otomatik "Tükendi (0)" göster.</p>
            <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input type="checkbox" checked={criticalStockEnabled}
                onChange={e => setCriticalStockEnabled(e.target.checked)} />
              <strong style={{ color: '#065F46' }}>Kritik Stok Eşiğini Etkinleştir</strong>
            </label>
            {criticalStockEnabled && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingLeft: 28 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#065F46' }}>Min. Stok:</label>
                <input type="number" min={0} className="wz-input"
                  style={{ width: 100 }}
                  value={criticalStockThreshold}
                  onChange={e => setCriticalStockThreshold(parseInt(e.target.value) || 0)} />
                <span style={{ fontSize: 12, color: '#047857' }}>adedin altındaki ürünler 0 sayılacak.</span>
              </div>
            )}
          </div>

          <div className="wz-footer">
            <button className="wz-btn wz-btn-light" onClick={prevStep}>← Geri (Filtreler)</button>
            <button className="wz-btn wz-btn-success" onClick={nextStep}>
              Devam Et (Özet) →
            </button>
          </div>
        </>
      )}

      {/* ----- STEP 6: ÖZET ----- */}
      {activeStep === 6 && (
        <>
          <div className="wz-block" style={{ borderTop: '6px solid #10B981' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 style={{ fontSize: 22 }}>📋 İçe Aktarım Özeti ve Final Onay</h3>
                <p className="wz-desc">Aşağıdaki tüm ayarları kontrol edip "Entegrasyonu Başlat" butonuna basın. Ürünler anında Shopify mağazanıza aktarılacaktır.</p>
              </div>
              <span className="wz-badge" style={{ padding: '6px 14px', fontSize: 12 }}>✨ Hazır</span>
            </div>
          </div>

          <div className="wz-block">
            <h3>⚙️ Konfigürasyon Özeti</h3>
            <div>
              <div className="wz-summary-row">
                <strong>1. Feed Başlığı</strong>
                <div className="val">{feedTitle}</div>
              </div>
              <div className="wz-summary-row">
                <strong>2. XML URL</strong>
                <div className="val" style={{ wordBreak: 'break-all' }}>{xmlUrl}</div>
              </div>
              <div className="wz-summary-row">
                <strong>3. Toplam Ürün</strong>
                <div className="val">{totalProducts} ürün analiz edildi</div>
              </div>
              <div className="wz-summary-row">
                <strong>4. Aktarım Modu</strong>
                <div className="val">
                  {importMode === 'all' && 'Tüm ürünler'}
                  {importMode === 'selected' && `${selectedIds.length} seçili ürün`}
                  {importMode === 'limit' && `İlk ${testLimit} ürün (test)`}
                </div>
              </div>
              <div className="wz-summary-row">
                <strong>5. Eşleme</strong>
                <div className="val">
                  {Object.entries(mapping).filter(([k, v]) =>
                    k !== 'images' ? !!v : (v as string[]).length > 0
                  ).length} alan eşleştirildi
                </div>
              </div>
              <div className="wz-summary-row">
                <strong>6. Fiyat Kuralları</strong>
                <div className="val">
                  {rules.length === 0 ? 'Kural yok (ham fiyat)' :
                    rules.map(r => `${r.calcMethod}: %${r.percentage}`).join(', ')}
                </div>
              </div>
              <div className="wz-summary-row">
                <strong>7. Filtreler</strong>
                <div className="val">
                  İçe aktarma: {filters.filter(f => f.type === 'import').length}, Güncelleme: {filters.filter(f => f.type === 'update').length}
                </div>
              </div>
              <div className="wz-summary-row">
                <strong>8. Yayın Kanalı</strong>
                <div className="val">{publishChannel} → {targetCollection}</div>
              </div>
              <div className="wz-summary-row">
                <strong>9. Davranış</strong>
                <div className="val">
                  Güncelleme: {allowUpdate ? '✅' : '❌'}, Yeni Ürün: {allowNew ? '✅' : '❌'},
                  Kritik Stok: {criticalStockEnabled ? `≤ ${criticalStockThreshold} → 0` : 'Devre dışı'}
                </div>
              </div>
            </div>
          </div>

          <div className="wz-footer">
            <button className="wz-btn wz-btn-light" onClick={prevStep} disabled={busy}>
              ← Ayarları Düzenle
            </button>
            <button className="wz-btn wz-btn-success" onClick={startIntegration} disabled={busy}
              style={{ padding: '14px 28px', fontSize: 15 }}>
              {busy ? '⏳ Shopify\'a Aktarılıyor...' : '🚀 Entegrasyonu Başlat ve Shopify\'a Aktar'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
