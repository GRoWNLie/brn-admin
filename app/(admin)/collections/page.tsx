'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { CollectionListItem, CollectionDetail } from '@/lib/shopify-collections'

// ─── Yardımcı bileşenler ──────────────────────────────────────────────────────

function Badge({ auto }: { auto: boolean }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
      background: auto ? '#EDE9FE' : '#ECFDF5',
      color: auto ? '#6D28D9' : '#065F46',
      border: `1px solid ${auto ? '#C4B5FD' : '#A7F3D0'}`,
    }}>
      {auto ? 'Otomatik' : 'Manuel'}
    </span>
  )
}

function ProductStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    ACTIVE: { label: 'Aktif', bg: '#ECFDF5', color: '#065F46' },
    DRAFT: { label: 'Taslak', bg: '#FEF3C7', color: '#92400E' },
    ARCHIVED: { label: 'Arşiv', bg: '#F3F4F6', color: '#374151' },
  }
  const s = map[status] ?? map.ARCHIVED
  return (
    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: s.bg, color: s.color, fontWeight: 600 }}>
      {s.label}
    </span>
  )
}

// ─── Ana bileşen ──────────────────────────────────────────────────────────────

export default function CollectionsPage() {
  const [collections, setCollections] = useState<CollectionListItem[]>([])
  const [order, setOrder] = useState<string[]>([])            // sürükle-bırak sırası
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<CollectionListItem | null>(null)
  const [detail, setDetail] = useState<CollectionDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Yeni koleksiyon formu
  const [showNew, setShowNew] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [creating, setCreating] = useState(false)

  // Düzenleme
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [saving, setSaving] = useState(false)

  // Ürün ekleme
  const [productSearch, setProductSearch] = useState('')
  const [productResults, setProductResults] = useState<any[]>([])
  const [productSearching, setProductSearching] = useState(false)
  const [addingProduct, setAddingProduct] = useState(false)

  // Sürükle-bırak
  const dragId = useRef<string | null>(null)
  const dragOverId = useRef<string | null>(null)

  // ── Koleksiyon listesini yükle ─────────────────────────────────────────────
  const load = useCallback(async (q?: string) => {
    setLoading(true)
    try {
      const url = '/api/shopify/collections' + (q ? `?search=${encodeURIComponent(q)}` : '')
      const res = await fetch(url)
      const data = await res.json()
      if (data.success) {
        setCollections(data.collections)
        setOrder(data.collections.map((c: CollectionListItem) => c.id))
      }
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  // ── Koleksiyon detayını yükle ──────────────────────────────────────────────
  async function selectCollection(c: CollectionListItem) {
    setSelected(c)
    setDetail(null)
    setDetailLoading(true)
    setProductSearch('')
    setProductResults([])
    try {
      const res = await fetch(`/api/shopify/collections/${encodeURIComponent(c.id)}`)
      const data = await res.json()
      if (data.success) {
        setDetail(data.collection)
        setEditTitle(data.collection.title)
        setEditDesc(data.collection.descriptionHtml ?? '')
      }
    } finally { setDetailLoading(false) }
  }

  // ── Koleksiyon kaydet (düzenle) ────────────────────────────────────────────
  async function saveEdit() {
    if (!selected) return
    setSaving(true)
    try {
      const res = await fetch(`/api/shopify/collections/${encodeURIComponent(selected.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle, descriptionHtml: editDesc }),
      })
      const data = await res.json()
      if (data.success) {
        await load(search)
        setSelected(prev => prev ? { ...prev, title: editTitle } : prev)
      } else alert('Hata: ' + data.message)
    } finally { setSaving(false) }
  }

  // ── Yeni koleksiyon oluştur ────────────────────────────────────────────────
  async function createOne() {
    if (!newTitle.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/shopify/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle, descriptionHtml: newDesc }),
      })
      const data = await res.json()
      if (data.success) {
        setNewTitle(''); setNewDesc(''); setShowNew(false)
        await load(search)
      } else alert('Hata: ' + data.message)
    } finally { setCreating(false) }
  }

  // ── Koleksiyon sil ─────────────────────────────────────────────────────────
  async function removeCollection(id: string, title: string) {
    if (!confirm(`"${title}" koleksiyonu Shopify'dan kalıcı olarak silinecek. Emin misin?`)) return
    await fetch(`/api/shopify/collections/${encodeURIComponent(id)}`, { method: 'DELETE' })
    if (selected?.id === id) { setSelected(null); setDetail(null) }
    await load(search)
  }

  // ── Ürün arama (koleksiyona eklemek için) ─────────────────────────────────
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  function onProductSearchChange(v: string) {
    setProductSearch(v)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (!v.trim()) { setProductResults([]); return }
    searchTimer.current = setTimeout(async () => {
      setProductSearching(true)
      try {
        const res = await fetch(`/api/shopify/products?first=10&search=${encodeURIComponent(v)}`)
        const data = await res.json()
        if (data.products) setProductResults(data.products)
      } finally { setProductSearching(false) }
    }, 400)
  }

  async function addProduct(productId: string) {
    if (!selected) return
    setAddingProduct(true)
    try {
      const res = await fetch(`/api/shopify/collections/${encodeURIComponent(selected.id)}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: [productId] }),
      })
      const data = await res.json()
      if (data.success) {
        setProductSearch(''); setProductResults([])
        await selectCollection(selected)
        await load(search)
      } else alert('Hata: ' + data.message)
    } finally { setAddingProduct(false) }
  }

  async function removeProduct(productId: string) {
    if (!selected) return
    await fetch(`/api/shopify/collections/${encodeURIComponent(selected.id)}/products`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productIds: [productId] }),
    })
    await selectCollection(selected)
    await load(search)
  }

  // ── Sürükle-bırak (yerel görsel sıralama) ─────────────────────────────────
  function onDragStart(id: string) { dragId.current = id }
  function onDragOver(e: React.DragEvent, id: string) {
    e.preventDefault(); dragOverId.current = id
  }
  function onDrop() {
    if (!dragId.current || !dragOverId.current || dragId.current === dragOverId.current) return
    setOrder(prev => {
      const arr = [...prev]
      const from = arr.indexOf(dragId.current!)
      const to = arr.indexOf(dragOverId.current!)
      arr.splice(from, 1)
      arr.splice(to, 0, dragId.current!)
      return arr
    })
    dragId.current = null; dragOverId.current = null
  }

  // görüntüleme sırası
  const filtered = search
    ? collections.filter(c => c.title.toLowerCase().includes(search.toLowerCase()))
    : [...collections].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div className="page-content">
      {/* Başlık */}
      <div className="product-header">
        <h1 className="page-title">Koleksiyonlar</h1>
        <button className="btn-primary" onClick={() => setShowNew(v => !v)}>
          {showNew ? '✕ İptal' : '➕ Yeni Koleksiyon'}
        </button>
      </div>

      {/* Yeni koleksiyon formu */}
      {showNew && (
        <div className="panel-card" style={{ marginBottom: 16, border: '1px solid #93C5FD' }}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>Yeni Koleksiyon</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              className="form-select"
              placeholder="Koleksiyon adı *"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createOne() }}
              autoFocus
            />
            <textarea
              className="form-select"
              placeholder="Açıklama (isteğe bağlı)"
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              rows={3}
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-primary" onClick={createOne} disabled={creating || !newTitle.trim()}>
                {creating ? '⏳ Oluşturuluyor...' : 'Oluştur'}
              </button>
              <button className="btn-secondary" onClick={() => { setShowNew(false); setNewTitle(''); setNewDesc('') }}>
                İptal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* İki sütun: sol = liste, sağ = detay */}
      <div style={{ display: 'grid', gridTemplateColumns: selected ? '340px 1fr' : '1fr', gap: 16 }}>

        {/* SOL: Koleksiyon listesi */}
        <div className="panel-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>
            <input
              className="form-select"
              placeholder="Koleksiyon ara..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') load(search) }}
              style={{ width: '100%' }}
            />
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              ⏳ Yükleniyor...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              {search ? `"${search}" bulunamadı.` : 'Henüz koleksiyon yok.'}
            </div>
          ) : (
            <div style={{ maxHeight: 'calc(100vh - 260px)', overflowY: 'auto' }}>
              {filtered.map(c => (
                <div
                  key={c.id}
                  draggable
                  onDragStart={() => onDragStart(c.id)}
                  onDragOver={e => onDragOver(e, c.id)}
                  onDrop={onDrop}
                  onClick={() => selectCollection(c)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 16px', cursor: 'grab',
                    borderBottom: '1px solid var(--border-color)',
                    background: selected?.id === c.id ? 'var(--hover-bg)' : 'transparent',
                    transition: 'background .15s',
                    userSelect: 'none',
                  }}
                >
                  {/* Küçük resim */}
                  <div style={{
                    width: 40, height: 40, borderRadius: 6, flexShrink: 0,
                    background: 'var(--hover-bg)', overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backgroundImage: c.image ? `url(${c.image})` : undefined,
                    backgroundSize: 'cover', backgroundPosition: 'center',
                    fontSize: 18,
                  }}>
                    {!c.image && '🗂'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.title}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                      <Badge auto={c.isAutomatic} />
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.productsCount} ürün</span>
                    </div>
                  </div>
                  <button
                    className="btn-secondary"
                    style={{ padding: '4px 8px', fontSize: 12, color: '#DC2626', borderColor: '#FCA5A5', flexShrink: 0 }}
                    onClick={e => { e.stopPropagation(); removeCollection(c.id, c.title) }}
                  >🗑</button>
                </div>
              ))}
              {!search && (
                <div style={{ padding: '8px 16px', fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
                  Sürükle-bırak ile sırala
                </div>
              )}
            </div>
          )}
        </div>

        {/* SAĞ: Koleksiyon detay + düzenleme */}
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Bilgi + düzenleme kartı */}
            <div className="panel-card">
              {detailLoading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>⏳ Yükleniyor...</div>
              ) : detail ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: 8, flexShrink: 0,
                      background: 'var(--hover-bg)', overflow: 'hidden',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      backgroundImage: detail.image ? `url(${detail.image})` : undefined,
                      backgroundSize: 'cover', backgroundPosition: 'center', fontSize: 28,
                    }}>
                      {!detail.image && '🗂'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{detail.title}</div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                        <Badge auto={detail.isAutomatic} />
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>/{detail.handle}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Başlık</label>
                      <input
                        className="form-select"
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        style={{ width: '100%' }}
                        disabled={detail.isAutomatic}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                        Açıklama {detail.isAutomatic && <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(otomatik koleksiyonda kural bilgisi)</span>}
                      </label>
                      <textarea
                        className="form-select"
                        value={editDesc}
                        onChange={e => setEditDesc(e.target.value)}
                        rows={3}
                        style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn-primary" onClick={saveEdit} disabled={saving}>
                        {saving ? '⏳ Kaydediliyor...' : '💾 Kaydet'}
                      </button>
                      <button className="btn-secondary" onClick={() => { setSelected(null); setDetail(null) }}>
                        ✕ Kapat
                      </button>
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            {/* Ürünler kartı */}
            {detail && !detail.isAutomatic && (
              <div className="panel-card">
                <div className="card-header" style={{ marginBottom: 12 }}>
                  <div className="card-title">Ürünler ({detail.productsCount})</div>
                </div>

                {/* Ürün ekle arama */}
                <div style={{ position: 'relative', marginBottom: 12 }}>
                  <input
                    className="form-select"
                    placeholder="Ürün adı veya SKU ile ara, ekle..."
                    value={productSearch}
                    onChange={e => onProductSearchChange(e.target.value)}
                    style={{ width: '100%' }}
                  />
                  {(productSearching || productResults.length > 0) && (
                    <div style={{
                      position: 'absolute', top: '110%', left: 0, right: 0, zIndex: 50,
                      background: 'var(--card-bg)', border: '1px solid var(--border-color)',
                      borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,.12)',
                      maxHeight: 260, overflowY: 'auto',
                    }}>
                      {productSearching && (
                        <div style={{ padding: 12, color: 'var(--text-muted)', fontSize: 13 }}>Aranıyor...</div>
                      )}
                      {productResults.filter(p => !detail.products.some(dp => dp.id === p.id)).map((p: any) => (
                        <div
                          key={p.id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '8px 12px', cursor: 'pointer',
                            borderBottom: '1px solid var(--border-color)',
                          }}
                          onClick={() => !addingProduct && addProduct(p.id)}
                        >
                          <div style={{
                            width: 32, height: 32, borderRadius: 4, flexShrink: 0,
                            background: 'var(--hover-bg)', overflow: 'hidden',
                            backgroundImage: p.image ? `url(${p.image})` : undefined,
                            backgroundSize: 'cover', backgroundPosition: 'center',
                          }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.vendor} · ₺{p.price}</div>
                          </div>
                          <button className="btn-secondary" style={{ fontSize: 12, padding: '4px 10px', color: '#2563EB', borderColor: '#93C5FD' }}>
                            {addingProduct ? '...' : '+ Ekle'}
                          </button>
                        </div>
                      ))}
                      {!productSearching && productResults.length > 0 && productResults.filter(p => !detail.products.some(dp => dp.id === p.id)).length === 0 && (
                        <div style={{ padding: 12, color: 'var(--text-muted)', fontSize: 13 }}>
                          Bulunan ürünler zaten bu koleksiyonda.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Mevcut ürünler */}
                {detail.products.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                    Bu koleksiyonda henüz ürün yok.<br />Yukarıdan arama yaparak ekleyebilirsiniz.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {detail.products.map((p, i) => (
                      <div
                        key={p.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '10px 0',
                          borderBottom: i < detail.products.length - 1 ? '1px solid var(--border-color)' : 'none',
                        }}
                      >
                        <div style={{
                          width: 40, height: 40, borderRadius: 6, flexShrink: 0,
                          background: 'var(--hover-bg)',
                          backgroundImage: p.image ? `url(${p.image})` : undefined,
                          backgroundSize: 'cover', backgroundPosition: 'center',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                        }}>
                          {!p.image && '📦'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.title}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 8, alignItems: 'center' }}>
                            <ProductStatusBadge status={p.status} />
                            <span>₺{p.price}</span>
                            <span>{p.totalInventory} stok</span>
                            {p.sku && <span>SKU: {p.sku}</span>}
                          </div>
                        </div>
                        <button
                          className="btn-secondary"
                          style={{ padding: '4px 8px', fontSize: 12, color: '#DC2626', borderColor: '#FCA5A5', flexShrink: 0 }}
                          onClick={() => removeProduct(p.id)}
                        >✕</button>
                      </div>
                    ))}
                    {detail.hasMoreProducts && (
                      <div style={{ padding: '10px 0', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                        + daha fazla ürün Shopify'da görünüyor (ilk 50 listelendi)
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Otomatik koleksiyon notu */}
            {detail?.isAutomatic && (
              <div className="panel-card" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                <div style={{ fontWeight: 600, marginBottom: 6, color: '#92400E' }}>Otomatik Koleksiyon</div>
                <div style={{ fontSize: 13, color: '#78350F' }}>
                  Bu koleksiyon Shopify&apos;da tanımlı kurallara göre otomatik doldurulur.
                  Ürün ekleme/çıkarma yerine Shopify Admin panelinden kuralları düzenleyebilirsiniz.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
