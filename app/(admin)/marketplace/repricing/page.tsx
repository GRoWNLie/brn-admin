'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Rule {
  id: number; marketplace: string; sku: string | null; enabled: boolean
  strategy: string; beatAmount: number | null; fixedPrice: number | null
  minPrice: number | null; maxPrice: number | null
  lastRunAt: string | null; lastAction: string | null
}

const MPS = ['TRENDYOL', 'HEPSIBURADA', 'AMAZON', 'ETSY']
const STRATEGY_LABEL: Record<string, string> = {
  match_buybox: 'Buybox fiyatına eşitle',
  beat_by: 'Buybox\'ı geç (− tutar)',
  fixed: 'Sabit fiyat',
}

const emptyForm = {
  id: 0, marketplace: 'AMAZON', sku: '', strategy: 'match_buybox',
  beatAmount: '', fixedPrice: '', minPrice: '', maxPrice: '', enabled: true,
}

export default function RepricingPage() {
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ ...emptyForm })
  const [showForm, setShowForm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [runMsg, setRunMsg] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/marketplace/repricing')
    const data = await res.json()
    if (data.success) setRules(data.rules)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) { setForm(p => ({ ...p, [k]: v })) }

  async function save() {
    if (!form.marketplace) return
    setBusy(true)
    try {
      const res = await fetch('/api/marketplace/repricing', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.success) { setShowForm(false); setForm({ ...emptyForm }); await load() }
    } finally { setBusy(false) }
  }

  async function remove(id: number) {
    if (!confirm('Kural silinsin mi?')) return
    await fetch(`/api/marketplace/repricing?id=${id}`, { method: 'DELETE' })
    await load()
  }

  function edit(r: Rule) {
    setForm({
      id: r.id, marketplace: r.marketplace, sku: r.sku || '', strategy: r.strategy,
      beatAmount: r.beatAmount?.toString() || '', fixedPrice: r.fixedPrice?.toString() || '',
      minPrice: r.minPrice?.toString() || '', maxPrice: r.maxPrice?.toString() || '', enabled: r.enabled,
    })
    setShowForm(true)
  }

  async function runNow() {
    setBusy(true); setRunMsg(null)
    try {
      const res = await fetch('/api/marketplace/repricing', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'run' }),
      })
      const data = await res.json()
      if (data.success) {
        const total = (data.results || []).reduce((s: number, r: any) => s + (r.changed || 0), 0)
        setRunMsg(`✓ Çalıştı — ${total} fiyat güncellendi. ${(data.results || []).map((r: any) => `${r.marketplace}: ${r.changed}↑/${r.skipped}–`).join(' · ')}`)
      } else setRunMsg('⚠️ ' + (data.message || 'Hata'))
      await load()
    } finally { setBusy(false) }
  }

  return (
    <div className="page-content">
      <div className="product-header">
        <h1 className="page-title">⚖️ Repricing / Buybox Otomasyonu</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/marketplace" className="btn-secondary" style={{ textDecoration: 'none' }}>← Pazaryerleri</Link>
          <button className="btn-secondary" onClick={runNow} disabled={busy}>{busy ? '⏳' : '▶️ Şimdi Çalıştır'}</button>
          <button className="btn-primary" onClick={() => { setForm({ ...emptyForm }); setShowForm(!showForm) }}>
            {showForm ? '✕ İptal' : '➕ Yeni Kural'}
          </button>
        </div>
      </div>

      {runMsg && (
        <div className="panel-card" style={{ fontSize: 13, color: runMsg.startsWith('⚠️') ? '#B91C1C' : '#065F46' }}>{runMsg}</div>
      )}

      {showForm && (
        <div className="panel-card" style={{ borderLeft: '4px solid #7C3AED' }}>
          <div className="settings-section-title">{form.id ? 'Kuralı Düzenle' : 'Yeni Repricing Kuralı'}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <div>
              <label className="form-label">Pazaryeri</label>
              <select className="form-select" style={{ width: '100%' }} value={form.marketplace} onChange={e => set('marketplace', e.target.value)}>
                {MPS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">SKU (boş = tüm ürünler)</label>
              <input className="form-select" style={{ width: '100%' }} value={form.sku} onChange={e => set('sku', e.target.value)} placeholder="boş = genel kural" />
            </div>
            <div>
              <label className="form-label">Strateji</label>
              <select className="form-select" style={{ width: '100%' }} value={form.strategy} onChange={e => set('strategy', e.target.value)}>
                <option value="match_buybox">Buybox'a eşitle</option>
                <option value="beat_by">Buybox'ı geç (−)</option>
                <option value="fixed">Sabit fiyat</option>
              </select>
            </div>
            {form.strategy === 'beat_by' && (
              <div>
                <label className="form-label">Geçme tutarı (₺)</label>
                <input type="number" step="0.01" className="form-select" style={{ width: '100%' }} value={form.beatAmount} onChange={e => set('beatAmount', e.target.value)} placeholder="0.50" />
              </div>
            )}
            {form.strategy === 'fixed' && (
              <div>
                <label className="form-label">Sabit fiyat (₺)</label>
                <input type="number" step="0.01" className="form-select" style={{ width: '100%' }} value={form.fixedPrice} onChange={e => set('fixedPrice', e.target.value)} />
              </div>
            )}
            <div>
              <label className="form-label">Min fiyat (taban)</label>
              <input type="number" step="0.01" className="form-select" style={{ width: '100%' }} value={form.minPrice} onChange={e => set('minPrice', e.target.value)} placeholder="alt sınır" />
            </div>
            <div>
              <label className="form-label">Max fiyat (tavan)</label>
              <input type="number" step="0.01" className="form-select" style={{ width: '100%' }} value={form.maxPrice} onChange={e => set('maxPrice', e.target.value)} placeholder="üst sınır" />
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginTop: 12 }}>
            <input type="checkbox" checked={form.enabled} onChange={e => set('enabled', e.target.checked)} /> Etkin
          </label>
          <button className="btn-primary" style={{ marginTop: 12 }} onClick={save} disabled={busy}>💾 Kaydet</button>
        </div>
      )}

      <div className="panel-card" style={{ padding: 0 }}>
        {loading ? <div style={{ padding: 40, textAlign: 'center' }}>⏳ Yükleniyor...</div>
          : rules.length === 0 ? (
            <div style={{ padding: 50, textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>⚖️</div>
              <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>Repricing kuralı yok</div>
              <div style={{ fontSize: 13, marginTop: 6 }}>"➕ Yeni Kural" ile oluştur. Buybox verisi olan pazaryerlerinde (özellikle Amazon) fiyatı otomatik ayarlar.</div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>Pazaryeri</th><th>SKU</th><th>Strateji</th><th>Min/Max</th><th>Son Çalışma</th><th>Durum</th><th></th></tr>
              </thead>
              <tbody>
                {rules.map(r => (
                  <tr key={r.id}>
                    <td><strong>{r.marketplace}</strong></td>
                    <td>{r.sku ? <code>{r.sku}</code> : <span style={{ color: 'var(--text-muted)' }}>Tüm ürünler</span>}</td>
                    <td><small>{STRATEGY_LABEL[r.strategy] || r.strategy}{r.strategy === 'beat_by' && r.beatAmount ? ` (−₺${r.beatAmount})` : ''}{r.strategy === 'fixed' && r.fixedPrice ? ` ₺${r.fixedPrice}` : ''}</small></td>
                    <td><small>{r.minPrice ?? '—'} / {r.maxPrice ?? '—'}</small></td>
                    <td><small>{r.lastRunAt ? new Date(r.lastRunAt).toLocaleString('tr-TR') : '—'}</small>{r.lastAction && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{r.lastAction.slice(0, 50)}</div>}</td>
                    <td><span className={`status-badge ${r.enabled ? 'delivered' : 'cancelled'}`}>{r.enabled ? 'Etkin' : 'Pasif'}</span></td>
                    <td>
                      <button className="btn-secondary" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => edit(r)}>✏️</button>
                      <button className="btn-secondary" style={{ fontSize: 11, padding: '4px 8px', color: '#DC2626' }} onClick={() => remove(r.id)}>🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      <div className="panel-card" style={{ background: 'var(--hover-bg)' }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          ℹ️ Repricing, buybox fiyatı dönen pazaryerlerinde çalışır (en güçlüsü <strong>Amazon</strong> — gerçek buybox verir).
          Trendyol/Hepsiburada/Etsy buybox rakip fiyatı API'de gelmediğinden bu pazaryerlerinde repricing ancak harici fiyat kaynağı bağlanınca aktif olur.
          Cron kurulduğunda (Ayarlar → CRON_SECRET + Vercel cron) otomatik periyodik çalışır; istediğin an "▶️ Şimdi Çalıştır" ile elle de tetikleyebilirsin.
          <strong> Min/Max fiyat sınırları</strong> zarar etmeni engeller — hedef fiyat her zaman bu aralıkta kalır.
        </div>
      </div>
    </div>
  )
}
