'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'

interface Field {
  key: string; label: string; secret: boolean; group: string
  placeholder?: string; source: 'db' | 'env' | 'none'; isSet: boolean; value: string | null
}

const TEST_SERVICE: Record<string, string> = {
  'Shopify': 'shopify',
  'E-posta (Resend)': 'email',
  'Yapay Zeka (Claude)': 'ai',
}

const SOURCE_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  db:   { label: 'Panelden', bg: '#DBEAFE', color: '#1E40AF' },
  env:  { label: '.env', bg: '#F3F4F6', color: '#6B7280' },
  none: { label: 'Tanımsız', bg: '#FEE2E2', color: '#991B1B' },
}

export default function ApiSettingsPage() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'

  const [fields, setFields] = useState<Field[]>([])
  const [loading, setLoading] = useState(true)
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [testing, setTesting] = useState<string | null>(null)
  const [testMsg, setTestMsg] = useState<Record<string, { ok: boolean; text: string }>>({})

  async function load() {
    setLoading(true)
    const res = await fetch('/api/settings/api-config')
    const data = await res.json()
    if (data.success) setFields(data.fields)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function save(key: string) {
    setSavingKey(key)
    try {
      const res = await fetch('/api/settings/api-config', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', key, value: edits[key] ?? '' }),
      })
      const data = await res.json()
      if (data.success) {
        setEdits(prev => { const n = { ...prev }; delete n[key]; return n })
        await load()
      }
    } finally { setSavingKey(null) }
  }

  async function test(group: string) {
    const service = TEST_SERVICE[group]
    if (!service) return
    setTesting(group); setTestMsg(prev => ({ ...prev, [group]: { ok: false, text: '' } }))
    try {
      const res = await fetch('/api/settings/api-config', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', service }),
      })
      const data = await res.json()
      setTestMsg(prev => ({ ...prev, [group]: { ok: !!data.success, text: data.message } }))
    } catch (e: any) {
      setTestMsg(prev => ({ ...prev, [group]: { ok: false, text: e?.message || 'Hata' } }))
    } finally { setTesting(null) }
  }

  // Grupla
  const groups = Array.from(new Set(fields.map(f => f.group)))

  return (
    <div className="page-content">
      <div className="product-header">
        <h1 className="page-title">🔑 API & Entegrasyon Ayarları</h1>
        <Link href="/settings" className="btn-secondary" style={{ textDecoration: 'none' }}>← Ayarlar</Link>
      </div>

      {!isAdmin && (
        <div className="panel-card" style={{ background: '#FEF3C7', color: '#92400E', fontSize: 13 }}>
          ⚠️ API anahtarlarını yalnızca <strong>ADMIN</strong> değiştirebilir. Görüntüleme açık.
        </div>
      )}

      {loading ? (
        <div className="panel-card" style={{ padding: 40, textAlign: 'center' }}>⏳ Yükleniyor...</div>
      ) : groups.map(group => {
        const items = fields.filter(f => f.group === group)
        const canTest = !!TEST_SERVICE[group]
        const tm = testMsg[group]
        return (
          <div key={group} className="panel-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div className="settings-section-title" style={{ marginBottom: 0 }}>{group}</div>
              {canTest && (
                <button className="btn-secondary" disabled={testing === group} onClick={() => test(group)}>
                  {testing === group ? '⏳ Test ediliyor...' : '🔌 Bağlantıyı Test Et'}
                </button>
              )}
            </div>

            {tm && tm.text && (
              <div style={{
                marginBottom: 12, padding: 10, borderRadius: 8, fontSize: 13,
                background: tm.ok ? '#ECFDF5' : '#FEF2F2', color: tm.ok ? '#065F46' : '#B91C1C',
              }}>{tm.ok ? '✓ ' : '✕ '}{tm.text}</div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {items.map(f => {
                const isEditing = edits[f.key] !== undefined
                const sb = SOURCE_BADGE[f.source]
                return (
                  <div key={f.key} style={{ display: 'grid', gridTemplateColumns: '200px 1fr 110px', gap: 12, alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{f.label}</div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 8, background: sb.bg, color: sb.color }}>{sb.label}</span>
                        <code style={{ fontSize: 10, color: 'var(--text-muted)' }}>{f.key}</code>
                      </div>
                    </div>
                    <div>
                      {f.secret ? (
                        <input className="form-select" style={{ width: '100%' }} type="password"
                          disabled={!isAdmin}
                          placeholder={f.isSet ? '•••••••• (kayıtlı — değiştirmek için yaz)' : (f.placeholder || 'Tanımlı değil')}
                          value={edits[f.key] ?? ''}
                          onChange={e => setEdits(prev => ({ ...prev, [f.key]: e.target.value }))} />
                      ) : (
                        <input className="form-select" style={{ width: '100%' }}
                          disabled={!isAdmin}
                          placeholder={f.placeholder || ''}
                          value={isEditing ? edits[f.key] : (f.value ?? '')}
                          onChange={e => setEdits(prev => ({ ...prev, [f.key]: e.target.value }))} />
                      )}
                    </div>
                    <button className="btn-primary" style={{ fontSize: 12 }}
                      disabled={!isAdmin || !isEditing || savingKey === f.key}
                      onClick={() => save(f.key)}>
                      {savingKey === f.key ? '⏳' : '💾 Kaydet'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      <div className="panel-card" style={{ background: 'var(--hover-bg)' }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          💡 Buraya girilen değerler veritabanında saklanır ve <strong>anında devreye girer</strong> (sunucu yeniden başlatmaya gerek yok).
          Boş bırakılan secret alanlar mevcut değeri korur; bir alanı temizlemek için içine boşluk yazıp kaydedin.
          DB'de değer yoksa <code>.env</code> dosyasındaki değer kullanılır. Secret değerler ekrana asla geri gönderilmez.
          Pazaryeri (Trendyol vb.) anahtarları <Link href="/marketplace">Pazaryerleri</Link> sayfasından yönetilir.
        </div>
      </div>
    </div>
  )
}
