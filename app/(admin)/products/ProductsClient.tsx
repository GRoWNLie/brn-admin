'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ProductListResult, ProductListItem, formatCurrency } from '@/lib/shopify-data'

export default function ProductsClient({
  data,
  search,
  first,
}: {
  data: ProductListResult
  search: string
  first: number
}) {
  const router = useRouter()
  const sp = useSearchParams()
  const [view, setView] = useState<'list' | 'grid'>('list')
  const [searchInput, setSearchInput] = useState(search)
  const [pending, startTransition] = useTransition()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [exportBusy, setExportBusy] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)
  const [binMap, setBinMap] = useState<Record<string, string>>({})

  // ── Modal state: hangisi açık ──
  type ModalKind = null | 'price' | 'stock' | 'tags'
  const [modal, setModal] = useState<ModalKind>(null)

  // Fiyat formu
  const [priceMode, setPriceMode] = useState<'percent_increase' | 'percent_decrease' | 'fixed'>('percent_increase')
  const [priceValue, setPriceValue] = useState<string>('')

  // Stok formu
  const [stockValue, setStockValue] = useState<string>('')

  // Etiket formu
  const [tagsMode, setTagsMode] = useState<'add' | 'remove'>('add')
  const [tagsInput, setTagsInput] = useState<string>('')

  // Dropdown dışına tıklayınca kapat
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Sayfadaki ürünlerin raf lokasyonlarını çek (SKU bazlı)
  useEffect(() => {
    const skus = data.products.map(p => p.sku).filter(Boolean) as string[]
    if (skus.length === 0) { setBinMap({}); return }
    fetch(`/api/bin-locations?skus=${encodeURIComponent(skus.join(','))}`)
      .then(r => r.json())
      .then(d => { if (d.success) setBinMap(d.map || {}) })
      .catch(() => {})
  }, [data.products])

  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  function toggleAll() {
    if (selected.size === data.products.length) setSelected(new Set())
    else setSelected(new Set(data.products.map(p => p.id)))
  }

  // ── CSV yardımcıları ──────────────────────────────────────────
  function escapeCell(v: string | number): string {
    const s = String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s
  }

  function downloadCSV(rows: ProductListItem[], filename: string) {
    const headers = ['Shopify ID', 'Başlık', 'Handle', 'SKU', 'Fiyat', 'Stok', 'Tedarikçi', 'Ürün Tipi', 'Durum']
    const lines = rows.map(p => [
      p.id.replace('gid://shopify/Product/', ''),
      p.title, p.handle, p.sku ?? '', p.price, p.totalInventory,
      p.vendor, p.productType, p.status,
    ].map(escapeCell).join(','))
    const csv = '﻿' + [headers.join(','), ...lines].join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  /** Seçili ürünleri sayfadaki veriden CSV olarak indirir */
  function exportSelected() {
    const rows = data.products.filter(p => selected.has(p.id))
    const date = new Date().toISOString().slice(0, 10)
    downloadCSV(rows, `urunler-secili-${date}.csv`)
  }

  /** Tüm ürünleri server'dan çekip indirir */
  async function exportAll(format: 'csv' | 'json') {
    setExportBusy(true)
    setExportOpen(false)
    try {
      const res = await fetch(`/api/shopify/products/export?format=${format}`)
      if (!res.ok) throw new Error(await res.text())
      const blob = await res.blob()
      const date = new Date().toISOString().slice(0, 10)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `urunler-${date}.${format}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert('Dışa aktarma hatası: ' + (e instanceof Error ? e.message : 'bilinmeyen'))
    } finally {
      setExportBusy(false)
    }
  }

  /** Tüm toplu işlemler buradan geçer; ekstra body alanları opts ile gelir */
  async function runBulk(
    action: 'delete' | 'set_status' | 'update_price' | 'update_stock' | 'add_tags' | 'remove_tags',
    opts: Record<string, unknown> = {},
    confirmMsg?: string,
  ) {
    if (selected.size === 0) return
    const ids = Array.from(selected)
    if (confirmMsg && !confirm(confirmMsg)) return

    setBulkBusy(true)
    try {
      const res = await fetch('/api/shopify/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, productIds: ids, ...opts }),
      })
      const data = await res.json()
      alert(
        `✅ Başarılı: ${data.successCount}/${data.processedCount}` +
        (data.failedCount > 0 ? `\n❌ Hatalı: ${data.errors.join('\n')}` : '')
      )
      setSelected(new Set())
      setModal(null)
      router.refresh()
    } finally { setBulkBusy(false) }
  }

  // ── Form submit'leri ──
  async function submitPrice() {
    const v = parseFloat(priceValue.replace(',', '.'))
    if (isNaN(v) || v < 0) { alert('Geçerli bir sayı girin'); return }
    const label = priceMode === 'percent_increase'
      ? `%${v} arttırılacak`
      : priceMode === 'percent_decrease'
        ? `%${v} azaltılacak`
        : `tüm fiyatlar ₺${v} olacak`
    await runBulk('update_price', { priceMode, priceValue: v },
      `${selected.size} ürünün fiyatı: ${label}. Devam?`)
  }

  async function submitStock() {
    const v = parseInt(stockValue, 10)
    if (isNaN(v) || v < 0) { alert('Geçerli bir tam sayı girin'); return }
    await runBulk('update_stock', { stockValue: v },
      `${selected.size} ürünün her varyantının stoğu ${v} olarak ayarlanacak. Devam?`)
  }

  async function submitTags() {
    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean)
    if (tags.length === 0) { alert('En az bir etiket girin (virgülle ayırın)'); return }
    const action = tagsMode === 'add' ? 'add_tags' : 'remove_tags'
    const verb = tagsMode === 'add' ? 'eklenecek' : 'çıkarılacak'
    await runBulk(action, { tags },
      `${selected.size} ürüne şu etiketler ${verb}: ${tags.join(', ')}. Devam?`)
  }

  function applySearch(value: string) {
    const params = new URLSearchParams(sp.toString())
    if (value) params.set('search', value); else params.delete('search')
    params.delete('after')
    startTransition(() => router.push(`/products?${params.toString()}`))
  }

  function changePageSize(size: number) {
    const params = new URLSearchParams(sp.toString())
    params.set('first', String(size))
    params.delete('after')
    startTransition(() => router.push(`/products?${params.toString()}`))
  }

  function goNext() {
    if (!data.pageInfo.endCursor) return
    const params = new URLSearchParams(sp.toString())
    params.set('after', data.pageInfo.endCursor)
    startTransition(() => router.push(`/products?${params.toString()}`))
  }

  function goReset() {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (first !== 25) params.set('first', String(first))
    startTransition(() => router.push(`/products?${params.toString()}`))
  }

  return (
    <div className="panel-card">
      <div className="single-tab-container">
        <span className="tab-active-line">Hepsi</span>
      </div>

      {selected.size > 0 && (
        <div style={{
          background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8,
          padding: '10px 16px', margin: '10px 0', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1E40AF' }}>
            {selected.size} ürün seçildi
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn-secondary" disabled={bulkBusy}
              onClick={() => runBulk('set_status', { status: 'ACTIVE' },
                `${selected.size} ürünün durumu AKTİF yapılacak. Devam?`)}>✅ Aktif Yap</button>
            <button className="btn-secondary" disabled={bulkBusy}
              onClick={() => runBulk('set_status', { status: 'DRAFT' },
                `${selected.size} ürünün durumu TASLAK yapılacak. Devam?`)}>📝 Taslak Yap</button>
            <button className="btn-secondary" disabled={bulkBusy}
              onClick={() => runBulk('set_status', { status: 'ARCHIVED' },
                `${selected.size} ürün ARŞİVLENECEK. Devam?`)}>📦 Arşivle</button>
            <button className="btn-secondary" disabled={bulkBusy}
              onClick={() => { setPriceValue(''); setModal('price') }}
              style={{ color: '#7C3AED', borderColor: '#C4B5FD' }}>💰 Fiyat</button>
            <button className="btn-secondary" disabled={bulkBusy}
              onClick={() => { setStockValue(''); setModal('stock') }}
              style={{ color: '#0891B2', borderColor: '#67E8F9' }}>📦 Stok</button>
            <button className="btn-secondary" disabled={bulkBusy}
              onClick={() => { setTagsInput(''); setModal('tags') }}
              style={{ color: '#D97706', borderColor: '#FCD34D' }}>🏷 Etiket</button>
            <button
              className="btn-secondary"
              disabled={bulkBusy}
              onClick={exportSelected}
              style={{ color: '#2563EB', borderColor: '#93C5FD' }}
            >
              ⬇ CSV İndir
            </button>
            <button className="btn-secondary" disabled={bulkBusy}
              style={{ color: '#DC2626', borderColor: '#FCA5A5' }}
              onClick={() => runBulk('delete', {},
                `${selected.size} ürün KALICI silinecek. Emin misin?`)}>🗑 Toplu Sil</button>
            <button className="btn-secondary" onClick={() => setSelected(new Set())}>✕ Seçimi Bırak</button>
          </div>
        </div>
      )}

      <div className="table-toolbar">
        <div className="toolbar-left">
          <div className="search-box-table">
            <input
              type="text"
              placeholder="Ürün, SKU veya tedarikçi ara..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') applySearch(searchInput) }}
            />
          </div>
          <button className="btn-secondary" onClick={() => applySearch(searchInput)}>
            {pending ? 'Aranıyor...' : 'Ara'}
          </button>
          {search && (
            <button className="btn-secondary" onClick={() => { setSearchInput(''); applySearch('') }}>
              ✕ Temizle
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Dışa Aktar dropdown */}
          <div ref={exportRef} style={{ position: 'relative' }}>
            <button
              className="btn-secondary"
              disabled={exportBusy}
              onClick={() => setExportOpen(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {exportBusy ? '⏳ İndiriliyor...' : '⬇ Dışa Aktar'}
              <span style={{ fontSize: 9 }}>▼</span>
            </button>
            {exportOpen && (
              <div style={{
                position: 'absolute', right: 0, top: '110%', zIndex: 100,
                background: 'var(--card-bg)', border: '1px solid var(--border-color)',
                borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,.12)',
                minWidth: 220, overflow: 'hidden',
              }}>
                <div style={{ padding: '8px 14px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: .5 }}>
                  Tüm Ürünler
                </div>
                <button
                  className="btn-secondary"
                  onClick={() => exportAll('csv')}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', border: 'none', borderRadius: 0, borderTop: '1px solid var(--border-color)' }}
                >
                  📄 CSV olarak indir
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Excel ile açılır</div>
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => exportAll('json')}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', border: 'none', borderRadius: 0, borderTop: '1px solid var(--border-color)' }}
                >
                  { } JSON olarak indir
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Geliştirici / API formatı</div>
                </button>
                {data.products.length > 0 && (
                  <>
                    <div style={{ padding: '8px 14px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: .5, borderTop: '1px solid var(--border-color)' }}>
                      Bu Sayfa ({data.products.length} ürün)
                    </div>
                    <button
                      className="btn-secondary"
                      onClick={() => { downloadCSV(data.products, `urunler-sayfa-${new Date().toISOString().slice(0, 10)}.csv`); setExportOpen(false) }}
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', border: 'none', borderRadius: 0, borderTop: '1px solid var(--border-color)' }}
                    >
                      📄 Sayfayı CSV indir
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="view-toggles">
            <button className={`btn-icon${view === 'list' ? ' active' : ''}`} onClick={() => setView('list')}>Liste</button>
            <button className={`btn-icon${view === 'grid' ? ' active' : ''}`} onClick={() => setView('grid')}>Grid</button>
          </div>
        </div>
      </div>

      {data.products.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
          {search ? `"${search}" araması için ürün bulunamadı.` : 'Henüz ürün yok.'}
        </div>
      ) : view === 'list' ? (
        <div className="data-table-container">
          <table className="data-table" id="productTable">
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <input
                    type="checkbox"
                    className="custom-checkbox"
                    checked={selected.size === data.products.length && data.products.length > 0}
                    onChange={toggleAll}
                  />
                </th>
                <th>Ürün</th>
                <th>Fiyat</th>
                <th>Stok</th>
                <th>Lokasyon</th>
                <th>Tedarikçi</th>
                <th>Durum</th>
                <th style={{ width: 120, textAlign: 'right' }}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {data.products.map(p => (
                <tr key={p.id}>
                  <td>
                    <input
                      type="checkbox"
                      className="custom-checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggleOne(p.id)}
                    />
                  </td>
                  <td>
                    <div className="product-cell">
                      <div
                        className="product-img"
                        style={p.image
                          ? { backgroundImage: `url(${p.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                          : undefined}
                      />
                      <div className="product-info">
                        <span className="product-name">{p.title}</span>
                        <span className="product-sku">{p.sku ?? p.handle}</span>
                      </div>
                    </div>
                  </td>
                  <td>{formatCurrency(p.price, p.currency)}</td>
                  <td>{p.totalInventory} adet</td>
                  <td>
                    {p.sku && binMap[p.sku]
                      ? <span className="badge badge-delivered" style={{ fontFamily: 'monospace' }}>{binMap[p.sku]}</span>
                      : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td>{p.vendor}</td>
                  <td>
                    <span className={`badge ${p.status === 'ACTIVE' ? 'badge-delivered' : 'badge-cancelled'}`}>
                      {p.status === 'ACTIVE' ? 'Aktif' : p.status === 'DRAFT' ? 'Taslak' : 'Arşiv'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <Link
                        href={`/products/${encodeURIComponent(p.id)}/edit`}
                        className="btn-secondary"
                        style={{ padding: '6px 12px', fontSize: 12, textDecoration: 'none' }}
                      >
                        ✏️ Düzenle
                      </Link>
                      <button
                        className="btn-secondary"
                        style={{ padding: '6px 10px', fontSize: 12, color: '#DC2626', borderColor: '#FCA5A5' }}
                        onClick={async () => {
                          if (!confirm(`"${p.title}" kalıcı silinecek. Emin misin?`)) return
                          const res = await fetch(`/api/shopify/products/${encodeURIComponent(p.id)}`, { method: 'DELETE' })
                          const data = await res.json()
                          if (data.success) { router.refresh() }
                          else alert('Silme hatası: ' + data.message)
                        }}
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="product-grid-view">
          {data.products.map(p => (
            <Link
              key={p.id}
              href={`/products/${encodeURIComponent(p.id)}/edit`}
              className="product-card-grid"
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div
                className="grid-img"
                style={p.image
                  ? { backgroundImage: `url(${p.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                  : undefined}
              />
              <div className="product-name">{p.title}</div>
              <div className="price-current">{formatCurrency(p.price, p.currency)}</div>
              <div className="product-sku" style={{ marginTop: 5 }}>
                {p.totalInventory} adet · {p.vendor}
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="table-footer">
        <div>
          Sayfa başına:
          <select
            className="row-count-select"
            value={first}
            onChange={e => changePageSize(parseInt(e.target.value, 10))}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span>{data.products.length} ürün gösteriliyor</span>
          {sp.get('after') && (
            <button className="btn-secondary" onClick={goReset} disabled={pending}>
              « İlk Sayfa
            </button>
          )}
          {data.pageInfo.hasNextPage && (
            <button className="btn-secondary" onClick={goNext} disabled={pending}>
              Sonraki Sayfa »
            </button>
          )}
        </div>
      </div>

      {/* ──────────── TOPLU İŞLEM MODAL'LARI ──────────── */}
      {modal && (
        <div
          onClick={() => !bulkBusy && setModal(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)',
            zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--card-bg)', borderRadius: 12, padding: 24,
              minWidth: 380, maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,.3)',
            }}
          >
            {/* Fiyat */}
            {modal === 'price' && (
              <>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>💰 Toplu Fiyat Güncelle</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                  {selected.size} ürünün tüm varyantlarına uygulanacak
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>İşlem</label>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {[
                        { v: 'percent_increase', label: '% Arttır' },
                        { v: 'percent_decrease', label: '% Azalt' },
                        { v: 'fixed', label: 'Sabit Fiyat' },
                      ].map(o => (
                        <button
                          key={o.v}
                          type="button"
                          onClick={() => setPriceMode(o.v as any)}
                          className="btn-secondary"
                          style={{
                            padding: '6px 12px', fontSize: 13,
                            ...(priceMode === o.v ? { background: '#EDE9FE', color: '#6D28D9', borderColor: '#C4B5FD', fontWeight: 600 } : {}),
                          }}
                        >{o.label}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                      {priceMode === 'fixed' ? 'Yeni Fiyat (₺)' : 'Yüzde (%)'}
                    </label>
                    <input
                      className="form-select"
                      type="text"
                      inputMode="decimal"
                      placeholder={priceMode === 'fixed' ? '99.90' : '10'}
                      value={priceValue}
                      onChange={e => setPriceValue(e.target.value)}
                      style={{ width: '100%' }}
                      autoFocus
                    />
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                      {priceMode === 'percent_increase' && 'Örn: 10 → fiyatlar %10 artar'}
                      {priceMode === 'percent_decrease' && 'Örn: 15 → fiyatlar %15 düşer'}
                      {priceMode === 'fixed' && 'Örn: 99.90 → tüm fiyatlar ₺99.90 olur'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button className="btn-primary" onClick={submitPrice} disabled={bulkBusy || !priceValue}>
                      {bulkBusy ? '⏳ Uygulanıyor...' : 'Uygula'}
                    </button>
                    <button className="btn-secondary" onClick={() => setModal(null)} disabled={bulkBusy}>İptal</button>
                  </div>
                </div>
              </>
            )}

            {/* Stok */}
            {modal === 'stock' && (
              <>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>📦 Toplu Stok Güncelle</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                  {selected.size} ürünün her varyantı bu değere ayarlanacak
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Yeni Stok Adedi</label>
                    <input
                      className="form-select"
                      type="number"
                      min={0}
                      placeholder="0"
                      value={stockValue}
                      onChange={e => setStockValue(e.target.value)}
                      style={{ width: '100%' }}
                      autoFocus
                    />
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                      Her varyantın stoğu sıfırdan ayarlanır (mevcut stoğun üzerine eklenmez)
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button className="btn-primary" onClick={submitStock} disabled={bulkBusy || !stockValue}>
                      {bulkBusy ? '⏳ Uygulanıyor...' : 'Uygula'}
                    </button>
                    <button className="btn-secondary" onClick={() => setModal(null)} disabled={bulkBusy}>İptal</button>
                  </div>
                </div>
              </>
            )}

            {/* Etiket */}
            {modal === 'tags' && (
              <>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>🏷 Toplu Etiket Yönet</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                  {selected.size} ürüne etiket ekle veya çıkar
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>İşlem</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => setTagsMode('add')}
                        className="btn-secondary"
                        style={{
                          padding: '6px 12px', fontSize: 13,
                          ...(tagsMode === 'add' ? { background: '#ECFDF5', color: '#065F46', borderColor: '#A7F3D0', fontWeight: 600 } : {}),
                        }}
                      >➕ Ekle</button>
                      <button
                        type="button"
                        onClick={() => setTagsMode('remove')}
                        className="btn-secondary"
                        style={{
                          padding: '6px 12px', fontSize: 13,
                          ...(tagsMode === 'remove' ? { background: '#FEE2E2', color: '#991B1B', borderColor: '#FCA5A5', fontWeight: 600 } : {}),
                        }}
                      >➖ Çıkar</button>
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Etiketler</label>
                    <input
                      className="form-select"
                      placeholder="yeni-sezon, indirim, kampanya"
                      value={tagsInput}
                      onChange={e => setTagsInput(e.target.value)}
                      style={{ width: '100%' }}
                      autoFocus
                    />
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                      Birden fazla etiket için virgülle ayırın. {tagsMode === 'add' ? 'Mevcut etiketler korunur.' : 'Eşleşen etiketler kaldırılır.'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button className="btn-primary" onClick={submitTags} disabled={bulkBusy || !tagsInput.trim()}>
                      {bulkBusy ? '⏳ Uygulanıyor...' : 'Uygula'}
                    </button>
                    <button className="btn-secondary" onClick={() => setModal(null)} disabled={bulkBusy}>İptal</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
