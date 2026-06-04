'use client'

import { useEffect, useState, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { formatDate } from '@/lib/shopify-data'
import BarcodeScanner from '@/components/BarcodeScanner'

interface Count {
  id: number; countNumber: string; status: string
  locationId: string; locationName: string; itemCount: number
  diffPositive: number; diffNegative: number
  startedAt: string; submittedAt?: string | null
  approvedAt?: string | null; approvedBy?: string | null
  appliedToShopify?: boolean; completedAt: string | null
}

interface Location { id: string; name: string }

const STATUS: Record<string, { label: string; cls: string }> = {
  IN_PROGRESS:      { label: 'Devam Ediyor', cls: 'pending' },
  PENDING_APPROVAL: { label: 'Onay Bekliyor', cls: 'pending' },
  COMPLETED:        { label: 'Tamamlandı', cls: 'delivered' },
  CANCELLED:        { label: 'İptal', cls: 'cancelled' },
}

export default function StockCountPage() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'

  const [counts, setCounts] = useState<Count[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<number | null>(null)
  const [activeCount, setActiveCount] = useState<Count | null>(null)
  const [activeItems, setActiveItems] = useState<any[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [newLocId, setNewLocId] = useState('')
  const [actionMsg, setActionMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Scan input
  const [scanBarcode, setScanBarcode] = useState('')
  const [scanTitle, setScanTitle] = useState('')
  const [scanLocation, setScanLocation] = useState('')
  const [scanExpected, setScanExpected] = useState('0')
  const [scanCounted, setScanCounted] = useState('1')
  const inputRef = useRef<HTMLInputElement>(null)
  const countedRef = useRef<HTMLInputElement>(null)

  const [matched, setMatched] = useState<{
    variantId: string; inventoryItemId: string | null
    productTitle: string; variantTitle: string
    sku: string | null; barcode: string | null
    image: string | null; available: number
  } | null>(null)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupMsg, setLookupMsg] = useState<string | null>(null)
  const [showScanner, setShowScanner] = useState(false)

  const editable = activeCount?.status === 'IN_PROGRESS'

  function onScanDetected(code: string) {
    setShowScanner(false)
    setScanBarcode(code)
    lookupCode(code)
  }

  async function lookupCode(codeArg?: string) {
    const code = (codeArg ?? scanBarcode).trim()
    if (!code) return
    setLookupLoading(true); setLookupMsg(null); setMatched(null); setScanLocation('')
    try {
      const res = await fetch(`/api/shopify/variant-lookup?code=${encodeURIComponent(code)}`)
      const data = await res.json()
      if (!data.success) {
        setLookupMsg(data.message || 'Arama başarısız.')
      } else if (!data.matches || data.matches.length === 0) {
        setLookupMsg('Bu barkod/SKU ile ürün bulunamadı. Aşağıdan elle de girebilirsin.')
      } else {
        const m = data.matches[0]
        setMatched(m)
        setScanTitle(m.variantTitle ? `${m.productTitle} — ${m.variantTitle}` : m.productTitle)
        setScanExpected(String(m.available))
        setScanCounted('1')
        if (data.matches.length > 1) setLookupMsg(`${data.matches.length} eşleşme bulundu, ilki seçildi.`)
        // Bilinen raf lokasyonunu getir
        if (m.sku) {
          fetch(`/api/bin-locations?skus=${encodeURIComponent(m.sku)}`)
            .then(r => r.json()).then(d => { if (d.success && d.map?.[m.sku]) setScanLocation(d.map[m.sku]) })
            .catch(() => {})
        }
        setTimeout(() => countedRef.current?.focus(), 50)
      }
    } catch (e: any) {
      setLookupMsg(e?.message || 'Bağlantı hatası.')
    } finally {
      setLookupLoading(false)
    }
  }

  function resetScan() {
    setScanBarcode(''); setScanTitle(''); setScanLocation(''); setScanExpected('0'); setScanCounted('1')
    setMatched(null); setLookupMsg(null)
    inputRef.current?.focus()
  }

  async function load() {
    setLoading(true)
    const [cRes, lRes] = await Promise.all([
      fetch('/api/stock-counts').then(r => r.json()),
      fetch('/api/shopify/inventory').then(r => r.json()).catch(() => ({ locations: [] })),
    ])
    if (cRes.success) setCounts(cRes.counts || [])
    if (lRes.success) setLocations(lRes.locations || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function startCount() {
    if (!newLocId) return
    const loc = locations.find(l => l.id === newLocId)
    const res = await fetch('/api/stock-counts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locationId: newLocId, locationName: loc?.name }),
    })
    const data = await res.json()
    if (data.success) {
      setShowCreate(false); setNewLocId('')
      await openCount(data.count.id)
      await load()
      inputRef.current?.focus()
    }
  }

  async function openCount(id: number) {
    setActionMsg(null); resetScan()
    const res = await fetch(`/api/stock-counts/${id}`)
    const data = await res.json()
    if (data.success) {
      setActiveId(id)
      setActiveCount(data.count)
      setActiveItems(data.count.items || [])
    }
  }

  function closeActive() {
    setActiveId(null); setActiveCount(null); setActiveItems([]); setActionMsg(null); resetScan()
  }

  async function addItem() {
    if (!activeId || !scanTitle) return
    const res = await fetch(`/api/stock-counts/${activeId}/items`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        barcode: matched?.barcode || scanBarcode,
        title: scanTitle,
        sku: matched?.sku || undefined,
        location: scanLocation || undefined,
        shopifyVariantId: matched?.variantId || undefined,
        inventoryItemId: matched?.inventoryItemId || undefined,
        expected: parseInt(scanExpected, 10) || 0,
        counted: parseInt(scanCounted, 10) || 0,
      }),
    })
    const data = await res.json()
    if (data.success) {
      setActiveItems(prev => [{ ...data.item, image: matched?.image ?? null }, ...prev])
      resetScan()
    }
  }

  async function deleteItem(itemId: number) {
    if (!activeId) return
    await fetch(`/api/stock-counts/${activeId}/items/${itemId}`, { method: 'DELETE' })
    setActiveItems(prev => prev.filter(i => i.id !== itemId))
  }

  async function patchCount(action: string) {
    if (!activeId) return
    setBusy(true); setActionMsg(null)
    try {
      const res = await fetch(`/api/stock-counts/${activeId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (data.success) {
        setActiveCount(data.count)
        if (data.message) setActionMsg(data.message)
        await load()
        if (action === 'approve' || action === 'cancel') {
          // tamamlanınca özet mesaj kalsın, panel açık kalsın (rapor görünümü)
        }
      } else {
        setActionMsg('⚠️ ' + (data.message || 'İşlem başarısız'))
      }
    } finally { setBusy(false) }
  }

  const totals = activeItems.reduce(
    (acc, i) => ({
      items: acc.items + 1,
      pos: acc.pos + (i.diff > 0 ? i.diff : 0),
      neg: acc.neg + (i.diff < 0 ? Math.abs(i.diff) : 0),
    }),
    { items: 0, pos: 0, neg: 0 }
  )

  return (
    <div className="page-content">
      <div className="product-header">
        <h1 className="page-title">📊 Stok Sayımı</h1>
        {!activeId && (
          <button className="btn-primary" onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? '✕ İptal' : '➕ Yeni Sayım Başlat'}
          </button>
        )}
      </div>

      {showCreate && !activeId && (
        <div className="panel-card" style={{ borderLeft: '4px solid #2563EB' }}>
          <div className="settings-section-title">Yeni Sayım Oturumu</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'end' }}>
            <div style={{ flex: 1 }}>
              <label className="form-label">Lokasyon (depo)</label>
              <select className="form-select" style={{ width: '100%' }}
                value={newLocId} onChange={e => setNewLocId(e.target.value)}>
                <option value="">Seçin...</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <button className="btn-primary" onClick={startCount} disabled={!newLocId}>
              ▶️ Sayımı Başlat
            </button>
          </div>
          {locations.length === 0 && (
            <div style={{ marginTop: 8, fontSize: 12, color: '#B45309' }}>
              ⚠️ Lokasyon yok — Shopify'da <code>read_locations</code> izni gerekli (Envanter Lokasyonları sayfasına bak).
            </div>
          )}
        </div>
      )}

      {activeId && activeCount && (
        <div className="panel-card" style={{
          borderLeft: `4px solid ${editable ? '#059669' : activeCount.status === 'PENDING_APPROVAL' ? '#D97706' : '#2563EB'}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <div className="settings-section-title" style={{ marginBottom: 0 }}>
              {editable ? '🔍 Sayım: Ürün Okut / Gir' : '📋 Sayım Raporu'} —{' '}
              <code>{activeCount.countNumber}</code>{' '}
              <span className={`status-badge ${STATUS[activeCount.status]?.cls || 'pending'}`}>
                {STATUS[activeCount.status]?.label || activeCount.status}
              </span>
            </div>
            <button className="btn-secondary" onClick={closeActive}>✕ Kapat</button>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
            Lokasyon: <strong>{activeCount.locationName}</strong>
            {activeCount.approvedBy && <> · Onaylayan: <strong>{activeCount.approvedBy}</strong> ({activeCount.approvedAt ? formatDate(activeCount.approvedAt) : ''})</>}
            {activeCount.appliedToShopify && <> · ✅ Shopify'a yazıldı</>}
          </div>

          {actionMsg && (
            <div style={{
              marginBottom: 12, padding: 10, borderRadius: 8, fontSize: 13,
              background: actionMsg.startsWith('⚠️') ? '#FEF2F2' : '#ECFDF5',
              color: actionMsg.startsWith('⚠️') ? '#B91C1C' : '#065F46',
            }}>{actionMsg}</div>
          )}

          {/* Barkod okut — sadece düzenlenebilir sayımda */}
          {editable && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, alignItems: 'end' }}>
                <div>
                  <label className="form-label">Barkod / SKU okut</label>
                  <input ref={inputRef} className="form-select" style={{ width: '100%' }}
                    value={scanBarcode}
                    onChange={e => setScanBarcode(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); lookupCode() } }}
                    placeholder="Barkodu okutun veya SKU yazıp Enter'a basın..."
                    autoFocus />
                </div>
                <button className="btn-secondary" onClick={() => setShowScanner(true)} title="Kameradan barkod oku" style={{ whiteSpace: 'nowrap' }}>
                  📷 Kamera
                </button>
                <button className="btn-primary" onClick={() => lookupCode()} disabled={lookupLoading || !scanBarcode.trim()}>
                  {lookupLoading ? '⏳ Aranıyor...' : '🔍 Bul'}
                </button>
              </div>

              {lookupMsg && (
                <div style={{ marginTop: 10, fontSize: 13, color: matched ? 'var(--text-muted)' : '#B45309' }}>
                  {matched ? 'ℹ️ ' : '⚠️ '}{lookupMsg}
                </div>
              )}

              {/* Bulunan ürün kartı */}
              {matched && (
                <div style={{
                  marginTop: 12, display: 'grid', gridTemplateColumns: '64px 1fr 140px 90px 90px 90px',
                  gap: 12, alignItems: 'center', padding: 14, borderRadius: 10,
                  background: 'var(--hover-bg)', border: '1px solid var(--border-color)',
                }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: 8, overflow: 'hidden', background: 'var(--bg-panel)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    border: '1px solid var(--border-color)',
                  }}>
                    {matched.image
                      ? <img src={matched.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: 24 }}>📦</span>}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)' }}>
                      {matched.productTitle}{matched.variantTitle ? ` — ${matched.variantTitle}` : ''}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <span>SKU: <strong>{matched.sku || '—'}</strong></span>
                      <span>Barkod: <strong>{matched.barcode || '—'}</strong></span>
                    </div>
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: 10 }}>Raf / Lokasyon</label>
                    <input className="form-select" style={{ width: '100%' }}
                      value={scanLocation} onChange={e => setScanLocation(e.target.value)}
                      placeholder="örn. A-12-3" />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <label className="form-label" style={{ fontSize: 10 }}>Beklenen</label>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>{scanExpected}</div>
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: 10 }}>Sayılan</label>
                    <input ref={countedRef} type="number" min={0} className="form-select" style={{ width: '100%', textAlign: 'center' }}
                      value={scanCounted}
                      onChange={e => setScanCounted(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') addItem() }} />
                  </div>
                  <button className="btn-primary" onClick={addItem} disabled={!scanTitle}>➕ Ekle</button>
                </div>
              )}

              {/* Eşleşme yoksa elle giriş */}
              {lookupMsg && !matched && !lookupLoading && (
                <div style={{
                  marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 140px 90px 90px 90px',
                  gap: 10, alignItems: 'end', padding: 14, borderRadius: 10,
                  background: 'var(--hover-bg)', border: '1px dashed var(--border-color)',
                }}>
                  <div>
                    <label className="form-label">Ürün Adı (elle)</label>
                    <input className="form-select" style={{ width: '100%' }}
                      value={scanTitle} onChange={e => setScanTitle(e.target.value)} placeholder="Ürün adı..." />
                  </div>
                  <div>
                    <label className="form-label">Raf / Lokasyon</label>
                    <input className="form-select" style={{ width: '100%' }}
                      value={scanLocation} onChange={e => setScanLocation(e.target.value)} placeholder="A-12-3" />
                  </div>
                  <div>
                    <label className="form-label">Beklenen</label>
                    <input type="number" min={0} className="form-select" style={{ width: '100%' }}
                      value={scanExpected} onChange={e => setScanExpected(e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label">Sayılan</label>
                    <input type="number" min={0} className="form-select" style={{ width: '100%' }}
                      value={scanCounted} onChange={e => setScanCounted(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') addItem() }} />
                  </div>
                  <button className="btn-primary" onClick={addItem} disabled={!scanTitle}>➕ Ekle</button>
                </div>
              )}
            </>
          )}

          {/* Özet */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginTop: 14 }}>
            <div style={{ padding: 12, background: 'var(--hover-bg)', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Sayılan Kalem</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{totals.items}</div>
            </div>
            <div style={{ padding: 12, background: '#ECFDF5', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#059669' }}>Fazla</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#059669' }}>+{totals.pos}</div>
            </div>
            <div style={{ padding: 12, background: '#FEF2F2', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#DC2626' }}>Eksik</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#DC2626' }}>-{totals.neg}</div>
            </div>
          </div>

          {/* Kalemler */}
          {activeItems.length > 0 && (
            <table className="data-table" style={{ marginTop: 14 }}>
              <thead>
                <tr>
                  <th></th><th>Ürün</th><th>SKU</th><th>Raf</th><th>Beklenen</th><th>Sayılan</th><th>Fark</th>
                  {editable && <th></th>}
                </tr>
              </thead>
              <tbody>
                {activeItems.map(i => (
                  <tr key={i.id}>
                    <td style={{ width: 44 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 6, overflow: 'hidden', background: 'var(--hover-bg)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {i.image
                          ? <img src={i.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <span style={{ fontSize: 15 }}>📦</span>}
                      </div>
                    </td>
                    <td>{i.title}</td>
                    <td><code style={{ fontSize: 11 }}>{i.sku || '—'}</code></td>
                    <td>{i.location ? <span className="status-badge pending">{i.location}</span> : '—'}</td>
                    <td>{i.expected}</td>
                    <td>{i.counted}</td>
                    <td><strong style={{ color: i.diff === 0 ? 'inherit' : i.diff > 0 ? '#059669' : '#DC2626' }}>
                      {i.diff > 0 ? '+' : ''}{i.diff}
                    </strong></td>
                    {editable && (
                      <td>
                        <button className="btn-secondary" style={{ fontSize: 11, padding: '4px 8px', color: '#DC2626' }}
                          onClick={() => deleteItem(i.id)}>🗑</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Aksiyon butonları */}
          <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {editable && (
              <>
                <button className="btn-primary" disabled={busy || activeItems.length === 0}
                  onClick={() => patchCount('submit')}>
                  📤 Sayımı Gönder (Onaya)
                </button>
                <button className="btn-secondary" style={{ color: '#DC2626' }} disabled={busy}
                  onClick={() => { if (confirm('Sayım iptal edilsin mi?')) patchCount('cancel') }}>
                  İptal Et
                </button>
              </>
            )}

            {activeCount.status === 'PENDING_APPROVAL' && (
              <>
                {isAdmin ? (
                  <>
                    <button className="btn-primary" disabled={busy}
                      onClick={() => { if (confirm('Onaylanınca sayılan miktarlar Shopify stoğuna YAZILACAK. Emin misin?')) patchCount('approve') }}>
                      ✅ Onayla & Shopify'a Yaz
                    </button>
                    <button className="btn-secondary" style={{ color: '#B45309' }} disabled={busy}
                      onClick={() => patchCount('reject')}>
                      ↩️ Reddet (Düzenlemeye Geri Gönder)
                    </button>
                  </>
                ) : (
                  <div style={{ fontSize: 13, color: '#B45309' }}>
                    ⏳ Bu sayım onay bekliyor. Onaylama yetkisi yalnızca <strong>ADMIN</strong>'de.
                  </div>
                )}
              </>
            )}

            {activeCount.status === 'COMPLETED' && isAdmin && (
              <button className="btn-secondary" disabled={busy} onClick={() => patchCount('reopen')}>
                🔓 Yeniden Aç (Düzenle)
              </button>
            )}
          </div>
        </div>
      )}

      {!activeId && (
        <div className="panel-card" style={{ padding: 0 }}>
          {loading ? <div style={{ padding: 40, textAlign: 'center' }}>⏳ Yükleniyor...</div>
            : counts.length === 0 ? (
              <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
                <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>Henüz sayım yapılmadı</div>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr><th>Sayım No</th><th>Lokasyon</th><th>Kalem</th><th>Fazla</th><th>Eksik</th><th>Durum</th><th>Tarih</th><th></th></tr>
                </thead>
                <tbody>
                  {counts.map(c => {
                    const st = STATUS[c.status] ?? { label: c.status, cls: 'pending' }
                    const canResume = c.status === 'IN_PROGRESS'
                    return (
                      <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => openCount(c.id)}>
                        <td><code>{c.countNumber}</code></td>
                        <td>{c.locationName}</td>
                        <td>{c.itemCount}</td>
                        <td><strong style={{ color: '#059669' }}>+{c.diffPositive}</strong></td>
                        <td><strong style={{ color: '#DC2626' }}>-{c.diffNegative}</strong></td>
                        <td><span className={`status-badge ${st.cls}`}>{st.label}</span></td>
                        <td><small>{formatDate(c.startedAt)}</small></td>
                        <td>
                          <button className="btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }}
                            onClick={e => { e.stopPropagation(); openCount(c.id) }}>
                            {canResume ? '✏️ Devam Et' : '👁 Görüntüle'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
        </div>
      )}

      {showScanner && (
        <BarcodeScanner onDetected={onScanDetected} onClose={() => setShowScanner(false)} />
      )}
    </div>
  )
}
