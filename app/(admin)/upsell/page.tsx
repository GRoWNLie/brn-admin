'use client'

import { useEffect, useState } from 'react'

interface Rule {
  id: number
  name: string
  sourceType: string
  sourceValue: string | null
  targetProductIds: string[]
  placement: string
  ruleType: string
  discountPercent: number | null
  priority: number
  active: boolean
  showCount: number
  clickCount: number
  purchaseCount: number
}

const PLACEMENT_LABEL: Record<string, string> = {
  cart: '🛒 Sepet',
  product_page: '📄 Ürün Sayfası',
  checkout: '💳 Ödeme',
  post_purchase: '✅ Satın Alma Sonrası',
}

const RULE_TYPE_LABEL: Record<string, string> = {
  upsell: '⬆️ Upsell (Üst Kategori)',
  cross_sell: '↔️ Cross-sell (Yan Ürün)',
  bump: '➕ Order Bump (Ek Ürün)',
}

export default function UpsellPage() {
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  // New rule form
  const [name, setName] = useState('')
  const [sourceType, setSourceType] = useState('tag')
  const [sourceValue, setSourceValue] = useState('')
  const [targetIds, setTargetIds] = useState('')
  const [placement, setPlacement] = useState('cart')
  const [ruleType, setRuleType] = useState('cross_sell')
  const [discountPercent, setDiscountPercent] = useState('')
  const [priority, setPriority] = useState('0')
  const [creating, setCreating] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/upsell/rules')
      const data = await res.json()
      if (data.success) setRules(data.rules || [])
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function create() {
    if (!name.trim() || !targetIds.trim()) { alert('İsim ve hedef ürün ID\'leri gerekli'); return }
    setCreating(true)
    try {
      const targets = targetIds.split(/[\s,\n]+/).map(s => s.trim()).filter(Boolean)
      const res = await fetch('/api/upsell/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          sourceType,
          sourceValue: sourceType === 'any' ? null : sourceValue,
          targetProductIds: targets,
          placement,
          ruleType,
          discountPercent: discountPercent ? parseInt(discountPercent, 10) : null,
          priority: parseInt(priority, 10),
        }),
      })
      const data = await res.json()
      if (data.success) {
        setName(''); setSourceValue(''); setTargetIds(''); setDiscountPercent(''); setPriority('0')
        setShowCreate(false)
        await load()
      } else alert('Hata: ' + data.message)
    } finally { setCreating(false) }
  }

  async function toggleActive(rule: Rule) {
    await fetch(`/api/upsell/rules/${rule.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !rule.active }),
    })
    await load()
  }

  async function remove(id: number, name: string) {
    if (!confirm(`"${name}" kuralı silinecek. Emin misin?`)) return
    await fetch(`/api/upsell/rules/${id}`, { method: 'DELETE' })
    await load()
  }

  const totalShow = rules.reduce((s, r) => s + r.showCount, 0)
  const totalClick = rules.reduce((s, r) => s + r.clickCount, 0)
  const totalPurchase = rules.reduce((s, r) => s + r.purchaseCount, 0)
  const ctr = totalShow > 0 ? ((totalClick / totalShow) * 100).toFixed(1) : '0.0'
  const cvr = totalClick > 0 ? ((totalPurchase / totalClick) * 100).toFixed(1) : '0.0'

  return (
    <div className="page-content">
      <div className="product-header">
        <h1 className="page-title">Upsell &amp; Cross-sell Motoru</h1>
        <div className="product-actions-right">
          <button className="btn-primary" onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? '✕ İptal' : '➕ Yeni Kural'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <div className="panel-card">
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Toplam Kural</div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>{rules.length}</div>
          <small style={{ color: 'var(--text-muted)' }}>{rules.filter(r => r.active).length} aktif</small>
        </div>
        <div className="panel-card">
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Gösterim</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#2563EB', marginTop: 4 }}>{totalShow}</div>
        </div>
        <div className="panel-card">
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Tıklama (CTR)</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#7C3AED', marginTop: 4 }}>{totalClick}</div>
          <small style={{ color: 'var(--text-muted)' }}>%{ctr}</small>
        </div>
        <div className="panel-card">
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Satın Alma (CVR)</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#059669', marginTop: 4 }}>{totalPurchase}</div>
          <small style={{ color: 'var(--text-muted)' }}>%{cvr}</small>
        </div>
      </div>

      {showCreate && (
        <div className="panel-card" style={{ borderLeft: '4px solid #7C3AED' }}>
          <div className="settings-section-title">Yeni Upsell Kuralı</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            <div>
              <label className="form-label">Kural Adı</label>
              <input className="form-select" style={{ width: '100%' }} value={name}
                onChange={e => setName(e.target.value)} placeholder="Örn: Tişört alana kep öner" />
            </div>
            <div>
              <label className="form-label">Yerleşim</label>
              <select className="form-select" style={{ width: '100%' }}
                value={placement} onChange={e => setPlacement(e.target.value)}>
                {Object.entries(PLACEMENT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Kural Tipi</label>
              <select className="form-select" style={{ width: '100%' }}
                value={ruleType} onChange={e => setRuleType(e.target.value)}>
                {Object.entries(RULE_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Kaynak Tipi</label>
              <select className="form-select" style={{ width: '100%' }}
                value={sourceType} onChange={e => setSourceType(e.target.value)}>
                <option value="any">Tüm ürünler</option>
                <option value="product">Belirli Ürün (ID)</option>
                <option value="tag">Etiket</option>
                <option value="category">Kategori (productType)</option>
              </select>
            </div>
            {sourceType !== 'any' && (
              <div>
                <label className="form-label">
                  Kaynak Değer ({sourceType === 'product' ? 'Shopify ID' : sourceType === 'tag' ? 'Etiket' : 'Kategori'})
                </label>
                <input className="form-select" style={{ width: '100%' }} value={sourceValue}
                  onChange={e => setSourceValue(e.target.value)}
                  placeholder={sourceType === 'tag' ? 'yaz, indirim' : sourceType === 'category' ? 'Tişört' : 'gid://shopify/Product/123'} />
              </div>
            )}
            <div>
              <label className="form-label">İndirim Yüzdesi (opsiyonel)</label>
              <input type="number" min="0" max="100" className="form-select" style={{ width: '100%' }}
                value={discountPercent} onChange={e => setDiscountPercent(e.target.value)}
                placeholder="örn: 10 → %10 indirim" />
            </div>
            <div>
              <label className="form-label">Öncelik (yüksek = önce gösterilir)</label>
              <input type="number" className="form-select" style={{ width: '100%' }}
                value={priority} onChange={e => setPriority(e.target.value)} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Hedef Ürün ID'leri (virgül veya yeni satır ile ayır)</label>
              <textarea className="form-select" style={{ width: '100%', minHeight: 80, fontFamily: 'monospace', fontSize: 12 }}
                value={targetIds} onChange={e => setTargetIds(e.target.value)}
                placeholder="gid://shopify/Product/123&#10;gid://shopify/Product/456" />
            </div>
          </div>
          <button className="btn-primary" style={{ marginTop: 14 }} onClick={create} disabled={creating}>
            {creating ? '⏳ Oluşturuluyor...' : '💾 Kuralı Kaydet'}
          </button>
        </div>
      )}

      <div className="panel-card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>⏳ Yükleniyor...</div>
        ) : rules.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎯</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-main)' }}>
              Henüz upsell kuralı yok
            </div>
            <div style={{ fontSize: 13, marginTop: 6 }}>
              "➕ Yeni Kural" ile başla
            </div>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Kural</th>
                <th>Tip</th>
                <th>Yerleşim</th>
                <th>Hedef Ürün</th>
                <th>İndirim</th>
                <th>Performans</th>
                <th>Öncelik</th>
                <th>Durum</th>
                <th style={{ textAlign: 'right' }}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {rules.map(r => (
                <tr key={r.id}>
                  <td>
                    <strong>{r.name}</strong>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {r.sourceType === 'any' ? 'Tüm ürünler' : `${r.sourceType}: ${r.sourceValue}`}
                    </div>
                  </td>
                  <td><small>{RULE_TYPE_LABEL[r.ruleType] || r.ruleType}</small></td>
                  <td><small>{PLACEMENT_LABEL[r.placement] || r.placement}</small></td>
                  <td>
                    <span className="badge badge-delivered">{r.targetProductIds.length} ürün</span>
                  </td>
                  <td>{r.discountPercent ? `%${r.discountPercent}` : '—'}</td>
                  <td>
                    <small>
                      👁 {r.showCount} · 🖱 {r.clickCount} · 🛒 {r.purchaseCount}
                    </small>
                  </td>
                  <td>{r.priority}</td>
                  <td>
                    <button onClick={() => toggleActive(r)}
                      style={{
                        cursor: 'pointer', border: 'none', borderRadius: 12,
                        padding: '4px 12px', fontSize: 11, fontWeight: 700,
                        background: r.active ? '#D1FAE5' : '#F3F4F6',
                        color: r.active ? '#065F46' : '#6B7280',
                      }}>
                      {r.active ? '✓ AKTİF' : '○ Pasif'}
                    </button>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn-secondary" style={{ padding: '6px 10px', fontSize: 12, color: '#DC2626', borderColor: '#FCA5A5' }}
                      onClick={() => remove(r.id, r.name)}>🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
