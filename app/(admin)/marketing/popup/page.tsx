'use client'

import { useEffect, useState } from 'react'

interface Popup {
  id: number
  name: string
  enabled: boolean
  headline: string
  description: string | null
  buttonText: string
  discountCode: string | null
  imageUrl: string | null
  triggerType: string
  triggerValue: number
  frequency: string
  position: string
  theme: string
  collectEmail: boolean
  views: number
  conversions: number
  _count?: { leads: number }
  createdAt: string
}

const TRIGGER_LABEL: Record<string, string> = {
  delay: '⏱ Süre Sonra', exit_intent: '🚪 Çıkış Niyeti', scroll: '📜 Kaydırma',
}

const emptyForm = {
  name: '', headline: '', description: '', buttonText: 'Kupon Al',
  discountCode: '', imageUrl: '', triggerType: 'delay', triggerValue: 5,
  frequency: 'once', position: 'center', theme: 'light', collectEmail: true,
}

export default function PopupPage() {
  const [popups, setPopups] = useState<Popup[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ ...emptyForm })

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/popups')
      const data = await res.json()
      if (data.success) setPopups(data.popups)
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  async function create() {
    if (!form.name || !form.headline) return
    const res = await fetch('/api/popups', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, enabled: true }),
    })
    const data = await res.json()
    if (data.success) { setShowCreate(false); setForm({ ...emptyForm }); await load() }
  }

  async function toggle(p: Popup) {
    await fetch(`/api/popups/${p.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !p.enabled }),
    })
    await load()
  }

  async function remove(p: Popup) {
    if (!confirm(`"${p.name}" popup silinecek. Emin misin?`)) return
    await fetch(`/api/popups/${p.id}`, { method: 'DELETE' })
    await load()
  }

  const convRate = (p: Popup) => p.views > 0 ? ((p.conversions / p.views) * 100).toFixed(1) : '0.0'

  return (
    <div className="page-content">
      <div className="product-header">
        <h1 className="page-title">💬 Popup Yönetimi</h1>
        <button className="btn-primary" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? '✕ İptal' : '➕ Yeni Popup'}
        </button>
      </div>

      {showCreate && (
        <div className="panel-card" style={{ borderLeft: '4px solid #EC4899' }}>
          <div className="settings-section-title">Yeni Popup</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Form */}
            <div style={{ display: 'grid', gap: 10 }}>
              <div>
                <label className="form-label">Popup Adı (dahili) *</label>
                <input className="form-select" style={{ width: '100%' }}
                  value={form.name} onChange={e => set('name', e.target.value)} placeholder="Yaz Kampanyası Popup" />
              </div>
              <div>
                <label className="form-label">Başlık *</label>
                <input className="form-select" style={{ width: '100%' }}
                  value={form.headline} onChange={e => set('headline', e.target.value)} placeholder="%10 İndirim Kazan!" />
              </div>
              <div>
                <label className="form-label">Açıklama</label>
                <textarea className="form-select" style={{ width: '100%', minHeight: 60 }}
                  value={form.description} onChange={e => set('description', e.target.value)}
                  placeholder="E-posta bültenimize katıl, ilk siparişinde indirim kazan." />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label className="form-label">Buton Yazısı</label>
                  <input className="form-select" style={{ width: '100%' }}
                    value={form.buttonText} onChange={e => set('buttonText', e.target.value)} />
                </div>
                <div>
                  <label className="form-label">İndirim Kuponu</label>
                  <input className="form-select" style={{ width: '100%' }}
                    value={form.discountCode} onChange={e => set('discountCode', e.target.value)} placeholder="HOSGELDIN10" />
                </div>
              </div>
              <div>
                <label className="form-label">Görsel URL (opsiyonel)</label>
                <input className="form-select" style={{ width: '100%' }}
                  value={form.imageUrl} onChange={e => set('imageUrl', e.target.value)} placeholder="https://..." />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label className="form-label">Tetikleyici</label>
                  <select className="form-select" style={{ width: '100%' }}
                    value={form.triggerType} onChange={e => set('triggerType', e.target.value)}>
                    <option value="delay">⏱ Süre Sonra</option>
                    <option value="exit_intent">🚪 Çıkış Niyeti</option>
                    <option value="scroll">📜 Kaydırma %</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">{form.triggerType === 'scroll' ? 'Kaydırma %' : 'Saniye'}</label>
                  <input type="number" min={0} className="form-select" style={{ width: '100%' }}
                    value={form.triggerValue} onChange={e => set('triggerValue', parseInt(e.target.value) || 0)} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div>
                  <label className="form-label">Sıklık</label>
                  <select className="form-select" style={{ width: '100%' }}
                    value={form.frequency} onChange={e => set('frequency', e.target.value)}>
                    <option value="once">Bir kez</option>
                    <option value="session">Oturum başı</option>
                    <option value="always">Her zaman</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Konum</label>
                  <select className="form-select" style={{ width: '100%' }}
                    value={form.position} onChange={e => set('position', e.target.value)}>
                    <option value="center">Orta</option>
                    <option value="bottom-right">Sağ alt</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Tema</label>
                  <select className="form-select" style={{ width: '100%' }}
                    value={form.theme} onChange={e => set('theme', e.target.value)}>
                    <option value="light">Açık</option>
                    <option value="dark">Koyu</option>
                  </select>
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <input type="checkbox" checked={form.collectEmail}
                  onChange={e => set('collectEmail', e.target.checked)} />
                E-posta topla (newsletter)
              </label>
            </div>

            {/* Canlı önizleme */}
            <div>
              <label className="form-label">Önizleme</label>
              <div style={{
                background: form.theme === 'dark' ? '#1f2937' : '#fff',
                color: form.theme === 'dark' ? '#e5e7eb' : '#1f2937',
                border: '1px solid var(--border-color)', borderRadius: 12, padding: 24,
                textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
              }}>
                {form.imageUrl && (
                  <img src={form.imageUrl} alt="" style={{ maxWidth: '100%', borderRadius: 8, marginBottom: 12, maxHeight: 120, objectFit: 'cover' }} />
                )}
                <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>{form.headline || 'Başlık'}</div>
                <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 14 }}>{form.description || 'Açıklama metni burada görünür.'}</div>
                {form.collectEmail && (
                  <input disabled placeholder="ornek@email.com" style={{
                    width: '100%', padding: 10, borderRadius: 8, border: '1px solid #d1d5db',
                    marginBottom: 10, boxSizing: 'border-box',
                  }} />
                )}
                <button style={{
                  background: '#EC4899', color: '#fff', border: 'none', padding: '10px 20px',
                  borderRadius: 8, fontWeight: 700, cursor: 'pointer', width: '100%',
                }}>{form.buttonText || 'Kupon Al'}</button>
                {form.discountCode && (
                  <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>Kupon: <strong>{form.discountCode}</strong></div>
                )}
              </div>
            </div>
          </div>
          <button className="btn-primary" style={{ marginTop: 14 }} onClick={create}>💾 Popup Oluştur</button>
        </div>
      )}

      <div className="panel-card" style={{ padding: 0 }}>
        {loading ? <div style={{ padding: 40, textAlign: 'center' }}>⏳ Yükleniyor...</div>
          : popups.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
              <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>Henüz popup yok</div>
              <div style={{ fontSize: 13, marginTop: 6 }}>"➕ Yeni Popup" ile oluştur. Aynı anda yalnızca 1 aktif popup gösterilir.</div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>Popup</th><th>Tetikleyici</th><th>Kupon</th><th>Gösterim</th><th>Dönüşüm</th><th>Oran</th><th>Durum</th><th>İşlem</th></tr>
              </thead>
              <tbody>
                {popups.map(p => (
                  <tr key={p.id}>
                    <td><strong>{p.name}</strong><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.headline}</div></td>
                    <td><small>{TRIGGER_LABEL[p.triggerType] ?? p.triggerType} ({p.triggerValue}{p.triggerType === 'scroll' ? '%' : 's'})</small></td>
                    <td>{p.discountCode ? <code>{p.discountCode}</code> : '—'}</td>
                    <td>{p.views}</td>
                    <td>{p.conversions} {p._count && <small style={{ color: 'var(--text-muted)' }}>({p._count.leads} email)</small>}</td>
                    <td><strong style={{ color: '#059669' }}>%{convRate(p)}</strong></td>
                    <td>
                      <button onClick={() => toggle(p)} style={{
                        border: 'none', cursor: 'pointer', padding: '4px 10px', borderRadius: 12,
                        fontSize: 11, fontWeight: 700,
                        background: p.enabled ? '#D1FAE5' : '#F3F4F6',
                        color: p.enabled ? '#065F46' : '#6B7280',
                      }}>{p.enabled ? '✓ Aktif' : '○ Pasif'}</button>
                    </td>
                    <td>
                      <button className="btn-secondary" style={{ fontSize: 11, padding: '4px 8px', color: '#DC2626' }}
                        onClick={() => remove(p)}>🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      <div className="panel-card" style={{ background: 'var(--hover-bg)' }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          🔌 <strong>Temaya ekleme:</strong> Shopify temanın <code>theme.liquid</code> dosyasının
          <code>&lt;/body&gt;</code> öncesine şunu ekle:
          <pre style={{ background: 'var(--bg-main)', padding: 10, borderRadius: 6, marginTop: 8, overflowX: 'auto', fontSize: 12 }}>
{`<script src="${typeof window !== 'undefined' ? window.location.origin : ''}/widget/popup.js" async></script>`}
          </pre>
        </div>
      </div>
    </div>
  )
}
