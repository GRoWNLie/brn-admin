'use client'

import { useEffect, useState } from 'react'

interface Flow {
  id: number
  name: string
  trigger: string
  channel: string
  enabled: boolean
  delayHours: number
  subject: string | null
  bodyTemplate: string | null
  discountCode: string | null
  lastRunAt: string | null
  sentCount: number
  createdAt: string
}

const TRIGGERS: Record<string, { label: string; icon: string; desc: string }> = {
  abandoned_cart: { label: 'Terk Edilmiş Sepet', icon: '🛒', desc: 'Sepeti terk eden müşteriye hatırlatma' },
  welcome:        { label: 'Hoş Geldin Serisi', icon: '👋', desc: 'Yeni kayıt olan müşteriye karşılama' },
  post_purchase:  { label: 'Satış Sonrası', icon: '📦', desc: 'Sipariş sonrası teşekkür / değerlendirme' },
  winback:        { label: 'Geri Kazanım', icon: '🔄', desc: 'Uzun süredir alışveriş yapmayan müşteri' },
  birthday:       { label: 'Doğum Günü', icon: '🎂', desc: 'Doğum gününde özel kupon' },
}

export default function AutomationPage() {
  const [flows, setFlows] = useState<Flow[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [busy, setBusy] = useState<number | null>(null)
  const [runMsg, setRunMsg] = useState<{ id: number; text: string } | null>(null)

  const [name, setName] = useState('')
  const [trigger, setTrigger] = useState('abandoned_cart')
  const [subject, setSubject] = useState('')
  const [discountCode, setDiscountCode] = useState('')
  const [delayHours, setDelayHours] = useState('1')

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/automation')
      const data = await res.json()
      if (data.success) setFlows(data.flows)
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function create() {
    if (!name) return
    const res = await fetch('/api/automation', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, trigger, subject, discountCode, delayHours: parseInt(delayHours, 10) || 0, enabled: true }),
    })
    const data = await res.json()
    if (data.success) {
      setShowCreate(false); setName(''); setSubject(''); setDiscountCode(''); setDelayHours('1')
      await load()
    }
  }

  async function toggle(f: Flow) {
    await fetch(`/api/automation/${f.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !f.enabled }),
    })
    await load()
  }

  async function remove(f: Flow) {
    if (!confirm(`"${f.name}" akışı silinecek. Emin misin?`)) return
    await fetch(`/api/automation/${f.id}`, { method: 'DELETE' })
    await load()
  }

  async function runNow(f: Flow) {
    setBusy(f.id); setRunMsg(null)
    try {
      const res = await fetch(`/api/automation/${f.id}`, { method: 'POST' })
      const data = await res.json()
      setRunMsg({ id: f.id, text: data.message || (data.success ? 'Çalıştırıldı' : 'Hata') })
      await load()
    } finally { setBusy(null) }
  }

  const activeCount = flows.filter(f => f.enabled).length
  const totalSent = flows.reduce((s, f) => s + f.sentCount, 0)

  return (
    <div className="page-content">
      <div className="product-header">
        <h1 className="page-title">🤖 Pazarlama Otomasyonu</h1>
        <button className="btn-primary" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? '✕ İptal' : '➕ Yeni Akış'}
        </button>
      </div>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
        <div className="panel-card">
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Toplam Akış</div>
          <div style={{ fontSize: 30, fontWeight: 800, marginTop: 4 }}>{flows.length}</div>
        </div>
        <div className="panel-card">
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Aktif Akış</div>
          <div style={{ fontSize: 30, fontWeight: 800, color: '#059669', marginTop: 4 }}>{activeCount}</div>
        </div>
        <div className="panel-card">
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Gönderilen Email</div>
          <div style={{ fontSize: 30, fontWeight: 800, color: '#2563EB', marginTop: 4 }}>{totalSent}</div>
        </div>
      </div>

      {showCreate && (
        <div className="panel-card" style={{ borderLeft: '4px solid #7C3AED' }}>
          <div className="settings-section-title">Yeni Otomasyon Akışı</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
            <div>
              <label className="form-label">Akış Adı *</label>
              <input className="form-select" style={{ width: '100%' }}
                value={name} onChange={e => setName(e.target.value)} placeholder="Örn: Sepet Hatırlatma" />
            </div>
            <div>
              <label className="form-label">Tetikleyici</label>
              <select className="form-select" style={{ width: '100%' }}
                value={trigger} onChange={e => setTrigger(e.target.value)}>
                {Object.entries(TRIGGERS).map(([v, t]) => (
                  <option key={v} value={v}>{t.icon} {t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Email Konusu</label>
              <input className="form-select" style={{ width: '100%' }}
                value={subject} onChange={e => setSubject(e.target.value)} placeholder="(boş bırakılırsa varsayılan)" />
            </div>
            <div>
              <label className="form-label">İndirim Kuponu (opsiyonel)</label>
              <input className="form-select" style={{ width: '100%' }}
                value={discountCode} onChange={e => setDiscountCode(e.target.value)} placeholder="GERIDON10" />
            </div>
            <div>
              <label className="form-label">Gecikme (saat)</label>
              <input type="number" min={0} className="form-select" style={{ width: '100%' }}
                value={delayHours} onChange={e => setDelayHours(e.target.value)} />
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
            💡 Şablonda <code>{'{{discount}}'}</code> yazarsan kupon kodu otomatik yerleşir.
          </div>
          <button className="btn-primary" style={{ marginTop: 14 }} onClick={create}>💾 Akış Oluştur</button>
        </div>
      )}

      <div className="panel-card" style={{ padding: 0 }}>
        {loading ? <div style={{ padding: 40, textAlign: 'center' }}>⏳ Yükleniyor...</div>
          : flows.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🤖</div>
              <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>Henüz otomasyon akışı yok</div>
              <div style={{ fontSize: 13, marginTop: 6 }}>"➕ Yeni Akış" ile ilk akışını oluştur.</div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>Akış</th><th>Tetikleyici</th><th>Kupon</th><th>Gönderim</th><th>Son Çalışma</th><th>Durum</th><th>İşlem</th></tr>
              </thead>
              <tbody>
                {flows.map(f => {
                  const t = TRIGGERS[f.trigger] ?? { label: f.trigger, icon: '⚙️', desc: '' }
                  return (
                    <tr key={f.id}>
                      <td>
                        <strong>{f.name}</strong>
                        {runMsg?.id === f.id && (
                          <div style={{ fontSize: 11, color: '#2563EB', marginTop: 4 }}>{runMsg.text}</div>
                        )}
                      </td>
                      <td><small>{t.icon} {t.label}</small></td>
                      <td>{f.discountCode ? <code>{f.discountCode}</code> : '—'}</td>
                      <td>{f.sentCount}</td>
                      <td><small>{f.lastRunAt ? new Date(f.lastRunAt).toLocaleString('tr-TR') : '—'}</small></td>
                      <td>
                        <button onClick={() => toggle(f)} style={{
                          border: 'none', cursor: 'pointer', padding: '4px 10px', borderRadius: 12,
                          fontSize: 11, fontWeight: 700,
                          background: f.enabled ? '#D1FAE5' : '#F3F4F6',
                          color: f.enabled ? '#065F46' : '#6B7280',
                        }}>{f.enabled ? '✓ Aktif' : '○ Pasif'}</button>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn-secondary" style={{ fontSize: 11, padding: '4px 8px' }}
                            disabled={busy === f.id} onClick={() => runNow(f)}>
                            {busy === f.id ? '⏳' : '▶️ Çalıştır'}
                          </button>
                          <button className="btn-secondary" style={{ fontSize: 11, padding: '4px 8px', color: '#DC2626' }}
                            onClick={() => remove(f)}>🗑</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
      </div>
    </div>
  )
}
