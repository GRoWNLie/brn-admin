'use client'

import { useEffect, useState } from 'react'
import Barcode from '@/components/Barcode'
import { barcodeSvg } from '@/lib/barcode'

type Mode = 'product' | 'location'

interface LabelEntry {
  key: string
  code: string        // barkoda kodlanacak değer
  title: string       // üstte
  info: string        // altta (fiyat / sku / lokasyon)
  qty: number
}

interface ProdResult {
  id: string; title: string; sku: string | null; barcode: string | null
  price: string; currency: string; image: string | null
}

const PAPER: Record<string, { label: string; css: string }> = {
  A4: { label: 'A4 (210 × 297 mm)', css: 'A4' },
  A5: { label: 'A5 (148 × 210 mm)', css: 'A5' },
  Letter: { label: 'Letter', css: 'letter' },
}

const LABELS: Record<string, { label: string; w: number; h: number }> = {
  small:  { label: 'Küçük (38 × 25 mm)', w: 38, h: 25 },
  medium: { label: 'Orta (58 × 40 mm)',  w: 58, h: 40 },
  large:  { label: 'Büyük (100 × 60 mm)', w: 100, h: 60 },
}

export default function BarcodePage() {
  const [mode, setMode] = useState<Mode>('product')
  const [paper, setPaper] = useState('A4')
  const [labelSize, setLabelSize] = useState('small')

  // Ürün arama
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<ProdResult[]>([])
  const [searchMsg, setSearchMsg] = useState<string | null>(null)

  // Lokasyon
  const [locInput, setLocInput] = useState('')
  const [locQty, setLocQty] = useState('1')
  const [savedLocs, setSavedLocs] = useState<{ sku: string; location: string }[]>([])

  // Etiket listesi
  const [labels, setLabels] = useState<LabelEntry[]>([])

  const dim = LABELS[labelSize]

  useEffect(() => {
    if (mode !== 'location') return
    fetch('/api/bin-locations').then(r => r.json())
      .then(d => { if (d.success) setSavedLocs(d.locations || []) })
      .catch(() => {})
  }, [mode])

  async function search() {
    const q = query.trim()
    if (!q) return
    setSearching(true); setSearchMsg(null); setResults([])
    try {
      const res = await fetch(`/api/shopify/products?search=${encodeURIComponent(q)}&first=20`)
      const data = await res.json()
      if (!data.success) { setSearchMsg(data.message || 'Arama başarısız.'); return }
      const items: ProdResult[] = (data.products || []).map((p: any) => ({
        id: p.id, title: p.title, sku: p.sku, barcode: p.barcode,
        price: p.price, currency: p.currency, image: p.image,
      }))
      setResults(items)
      if (items.length === 0) setSearchMsg('Ürün bulunamadı.')
    } catch (e: any) {
      setSearchMsg(e?.message || 'Bağlantı hatası.')
    } finally { setSearching(false) }
  }

  function addProduct(p: ProdResult) {
    const code = p.barcode || p.sku || ''
    if (!code) { alert('Bu ürünün barkodu/SKU\'su yok, etiket üretilemez.'); return }
    setLabels(prev => {
      const exist = prev.find(l => l.key === 'p_' + p.id)
      if (exist) return prev.map(l => l.key === exist.key ? { ...l, qty: l.qty + 1 } : l)
      return [...prev, {
        key: 'p_' + p.id, code,
        title: p.title,
        info: `${p.sku || code} · ${formatPrice(p.price, p.currency)}`,
        qty: 1,
      }]
    })
  }

  function addLocations() {
    const codes = locInput.split(/[\n,]/).map(s => s.trim()).filter(Boolean)
    const qty = Math.max(1, parseInt(locQty, 10) || 1)
    if (codes.length === 0) return
    setLabels(prev => {
      const next = [...prev]
      for (const code of codes) {
        const key = 'l_' + code
        const exist = next.find(l => l.key === key)
        if (exist) exist.qty += qty
        else next.push({ key, code, title: '📍 Raf / Lokasyon', info: code, qty })
      }
      return next
    })
    setLocInput('')
  }

  function setQty(key: string, qty: number) {
    setLabels(prev => prev.map(l => l.key === key ? { ...l, qty: Math.max(1, qty) } : l))
  }
  function removeLabel(key: string) {
    setLabels(prev => prev.filter(l => l.key !== key))
  }

  const totalLabels = labels.reduce((s, l) => s + l.qty, 0)

  // Yazdırma — ayrı pencerede temiz çıktı
  function printLabels() {
    if (labels.length === 0) return
    const cells: string[] = []
    for (const l of labels) {
      const svg = barcodeSvg(l.code, { height: 60, moduleWidth: 1.6, displayValue: true, fontSize: 12, margin: 6 })
      for (let i = 0; i < l.qty; i++) {
        cells.push(
          `<div class="label">` +
          `<div class="t">${escapeHtml(l.title)}</div>` +
          `<div class="bc">${svg}</div>` +
          `<div class="i">${escapeHtml(l.info)}</div>` +
          `</div>`
        )
      }
    }
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Barkod Etiketleri</title>
<style>
  @page { size: ${PAPER[paper].css}; margin: 8mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, Segoe UI, sans-serif; }
  .sheet { display: flex; flex-wrap: wrap; align-content: flex-start; gap: 2mm; }
  .label {
    width: ${dim.w}mm; height: ${dim.h}mm; border: 1px solid #e5e7eb;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 1mm 1.5mm; overflow: hidden; page-break-inside: avoid;
  }
  .label .t { font-size: ${labelSize === 'small' ? 6.5 : labelSize === 'medium' ? 8 : 10}pt;
    font-weight: 600; text-align: center; line-height: 1.1; max-height: 2.4em; overflow: hidden;
    white-space: nowrap; text-overflow: ellipsis; max-width: 100%; }
  .label .bc { flex: 1; display: flex; align-items: center; justify-content: center; width: 100%; min-height: 0; }
  .label .bc svg { max-width: 100%; max-height: 100%; height: auto; }
  .label .i { font-size: ${labelSize === 'small' ? 6 : labelSize === 'medium' ? 7.5 : 9}pt;
    color: #374151; text-align: center; white-space: nowrap; max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
  @media print { .label { border-color: transparent; } }
</style></head><body><div class="sheet">${cells.join('')}</div>
<script>window.onload=function(){setTimeout(function(){window.print()},150)}<\/script>
</body></html>`
    const w = window.open('', '_blank', 'width=900,height=700')
    if (!w) { alert('Yazdırma penceresi açılamadı (popup engelleyici?).'); return }
    w.document.write(html); w.document.close()
  }

  return (
    <div className="page-content">
      <div className="product-header">
        <h1 className="page-title">🏷 Barkod Etiketi</h1>
        <div className="product-actions-right" style={{ display: 'flex', gap: 8 }}>
          {labels.length > 0 && (
            <button className="btn-secondary" onClick={() => setLabels([])}>✕ Listeyi Temizle</button>
          )}
          <button className="btn-primary" onClick={printLabels} disabled={labels.length === 0}>
            🖨 Yazdır ({totalLabels})
          </button>
        </div>
      </div>

      {/* Mod seçimi */}
      <div className="panel-card" style={{ display: 'flex', gap: 8 }}>
        <button className="btn-secondary" onClick={() => setMode('product')}
          style={mode === 'product' ? { background: '#EDE9FE', color: '#6D28D9', borderColor: '#C4B5FD', fontWeight: 600 } : {}}>
          📦 Ürün Etiketi
        </button>
        <button className="btn-secondary" onClick={() => setMode('location')}
          style={mode === 'location' ? { background: '#EDE9FE', color: '#6D28D9', borderColor: '#C4B5FD', fontWeight: 600 } : {}}>
          📍 Lokasyon Etiketi
        </button>
      </div>

      <div className="panel-card">
        <div className="barcode-form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Kağıt Boyutu</label>
            <select className="form-select" value={paper} onChange={e => setPaper(e.target.value)}>
              {Object.entries(PAPER).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Etiket Boyutu</label>
            <select className="form-select" value={labelSize} onChange={e => setLabelSize(e.target.value)}>
              {Object.entries(LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </div>

        {/* Ürün modu */}
        {mode === 'product' && (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="form-select" style={{ flex: 1 }}
                placeholder="Ürün adı, SKU veya barkod ara..."
                value={query} onChange={e => setQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') search() }} />
              <button className="btn-primary" onClick={search} disabled={searching || !query.trim()}>
                {searching ? '⏳ Aranıyor...' : '🔍 Ara'}
              </button>
            </div>
            {searchMsg && <div style={{ marginTop: 8, fontSize: 13, color: '#B45309' }}>⚠️ {searchMsg}</div>}
            {results.length > 0 && (
              <div style={{ marginTop: 10, border: '1px solid var(--border-color)', borderRadius: 8, maxHeight: 260, overflowY: 'auto' }}>
                {results.map(p => {
                  const code = p.barcode || p.sku
                  return (
                    <div key={p.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px',
                      borderBottom: '1px solid var(--border-color)',
                    }}>
                      <div style={{ width: 38, height: 38, borderRadius: 6, background: 'var(--hover-bg)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {p.image ? <img src={p.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span>📦</span>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {code ? <>Kod: <code>{code}</code></> : <span style={{ color: '#DC2626' }}>barkod/SKU yok</span>} · {formatPrice(p.price, p.currency)}
                        </div>
                      </div>
                      <button className="btn-secondary" disabled={!code} onClick={() => addProduct(p)}>➕ Ekle</button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Lokasyon modu */}
        {mode === 'location' && (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 120px', gap: 8, alignItems: 'end' }}>
              <div>
                <label className="form-label">Lokasyon kod(lar)ı — her satıra bir kod veya virgülle</label>
                <textarea className="form-select" style={{ width: '100%', minHeight: 60 }}
                  placeholder={'A-01\nA-02\nB-12-3'}
                  value={locInput} onChange={e => setLocInput(e.target.value)} />
              </div>
              <div>
                <label className="form-label">Adet (her kod)</label>
                <input type="number" min={1} className="form-select" style={{ width: '100%' }}
                  value={locQty} onChange={e => setLocQty(e.target.value)} />
              </div>
              <button className="btn-primary" onClick={addLocations} disabled={!locInput.trim()}>➕ Etikete Ekle</button>
            </div>
            {savedLocs.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Kayıtlı raf lokasyonları (tıkla → ekle):</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {savedLocs.map(s => (
                    <button key={s.sku} className="btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }}
                      onClick={() => setLabels(prev => {
                        const key = 'l_' + s.location
                        if (prev.find(l => l.key === key)) return prev.map(l => l.key === key ? { ...l, qty: l.qty + 1 } : l)
                        return [...prev, { key, code: s.location, title: '📍 Raf / Lokasyon', info: s.location, qty: 1 }]
                      })}>
                      📍 {s.location}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Önizleme */}
      <div className="panel-card">
        <div className="settings-section-title">
          Önizleme {totalLabels > 0 && <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>· {totalLabels} etiket</span>}
        </div>
        {labels.length === 0 ? (
          <div style={{ padding: 50, textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 13 }}>
              {mode === 'product'
                ? 'Yukarıdan ürün arayıp "Ekle" ile etiket listesine ekleyin.'
                : 'Lokasyon kodu girip "Etikete Ekle" ile ekleyin.'}
            </div>
          </div>
        ) : (
          <>
            {/* Liste + adet ayarı */}
            <table className="data-table" style={{ marginBottom: 16 }}>
              <thead><tr><th>Etiket</th><th>Kod</th><th style={{ width: 120 }}>Adet</th><th style={{ width: 60 }}></th></tr></thead>
              <tbody>
                {labels.map(l => (
                  <tr key={l.key}>
                    <td>{l.title}<div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l.info}</div></td>
                    <td><code>{l.code}</code></td>
                    <td>
                      <input type="number" min={1} className="form-select" style={{ width: 90 }}
                        value={l.qty} onChange={e => setQty(l.key, parseInt(e.target.value, 10) || 1)} />
                    </td>
                    <td>
                      <button className="btn-secondary" style={{ color: '#DC2626', fontSize: 12, padding: '4px 8px' }}
                        onClick={() => removeLabel(l.key)}>🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Görsel önizleme — gerçek etiket boyutunda */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {labels.map(l => (
                <div key={l.key} style={{
                  width: `${dim.w}mm`, height: `${dim.h}mm`,
                  border: '1px solid var(--border-color)', borderRadius: 4,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  padding: '1mm', overflow: 'hidden', background: '#fff',
                }}>
                  <div style={{ fontSize: 9, fontWeight: 600, color: '#111', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{l.title}</div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0, width: '100%' }}>
                    <Barcode value={l.code} height={50} moduleWidth={1.4} fontSize={11} margin={4} />
                  </div>
                  <div style={{ fontSize: 8, color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{l.info}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
              💡 Etiket boyutu: <strong>{dim.w}×{dim.h} mm</strong> · Kağıt: <strong>{PAPER[paper].label}</strong>.
              "🖨 Yazdır" gerçek boyutta çıktı verir (yazıcı ayarlarında ölçeklendirmeyi <strong>%100</strong> yapın).
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function formatPrice(price: string, currency: string) {
  const n = parseFloat(price || '0')
  const sym = currency === 'TRY' ? '₺' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : ''
  return `${sym}${n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function escapeHtml(s: string) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
